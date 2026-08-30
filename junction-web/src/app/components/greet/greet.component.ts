import { Component, OnInit, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { City, Locality } from '../../models/location.model';
import { LocationsService } from '../../services/locations.service';
import {
  LocationPickerModalComponent,
  PickerOption,
} from '../location-picker-modal/location-picker-modal.component';

type ActivePicker = 'city' | 'locality' | null;

const LOCALITY_GEOCODE_ERROR =
  'If the geocoding function fails, please enter a real locality or a prominent locality.';

@Component({
  selector: 'app-greet',
  imports: [ReactiveFormsModule, LocationPickerModalComponent],
  templateUrl: './greet.component.html',
  styleUrl: './greet.component.scss',
})
export class GreetComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly locationsService = inject(LocationsService);

  readonly allowDismiss = input(false);
  readonly initialName = input('');
  readonly initialCity = input<City | null>(null);
  readonly initialLocality = input<Locality | null>(null);

  readonly submitted = output<{ name: string; city: City; locality: Locality }>();
  readonly dismissed = output<void>();
  readonly locationPreview = output<{
    latitude: number;
    longitude: number;
    label: string;
    zoom: number;
  }>();

  cities: City[] = [];
  localities: Locality[] = [];
  localitiesLoading = false;

  readonly activePicker = signal<ActivePicker>(null);
  readonly selectedCity = signal<City | null>(null);
  readonly selectedLocality = signal<Locality | null>(null);
  readonly localityGeocodeError = signal<string | null>(null);
  readonly localityValidating = signal(false);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);

  private pendingAddJunction = false;
  private hydratedFromInitial = false;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
  });

  constructor() {
    effect(() => {
      if (this.hydratedFromInitial) {
        return;
      }

      const name = this.initialName().trim();
      const city = this.initialCity();
      const locality = this.initialLocality();
      if (!name && !city) {
        return;
      }

      this.hydratedFromInitial = true;
      if (name) {
        this.form.controls.name.setValue(name);
      }
      if (city) {
        this.selectedCity.set(city);
        this.localitiesLoading = true;
        this.locationsService.getLocalities(city.name).subscribe((localities) => {
          this.localities = localities;
          this.localitiesLoading = false;
          if (locality) {
            const match =
              localities.find((item) => item.name === locality.name) ?? locality;
            this.selectedLocality.set(match);
          }
        });
      }
    });
  }

  ngOnInit(): void {
    this.locationsService.getCities().subscribe((cities) => {
      this.cities = cities;
    });
  }

  get cityPickerOptions(): PickerOption[] {
    return this.cities.map((city) => ({ id: city.id, label: city.name }));
  }

  get localityPickerOptions(): PickerOption[] {
    return this.localities.map((locality) => ({ id: locality.id, label: locality.name }));
  }

  dismiss(): void {
    if (!this.allowDismiss()) {
      return;
    }
    this.dismissed.emit();
  }

  openCityPicker(): void {
    this.activePicker.set('city');
  }

  openLocalityPicker(): void {
    if (!this.selectedCity() || this.localitiesLoading) {
      return;
    }

    this.localityGeocodeError.set(null);
    this.activePicker.set('locality');
  }

  closePicker(): void {
    this.activePicker.set(null);
    this.localityGeocodeError.set(null);
    this.localityValidating.set(false);
  }

  clearLocalityGeocodeError(): void {
    this.localityGeocodeError.set(null);
  }

  onCityPicked(cityName: string): void {
    const trimmed = cityName.trim();
    if (!trimmed) {
      return;
    }

    const knownCity = this.cities.find(
      (city) => city.name.toLowerCase() === trimmed.toLowerCase(),
    );

    if (knownCity) {
      this.applyCitySelection(knownCity);
      return;
    }

    this.locationsService.resolveCity(trimmed).subscribe((city) => {
      this.applyCitySelection(city);
    });
  }

  onLocalityPicked(localityName: string): void {
    const city = this.selectedCity();
    const trimmed = localityName.trim();

    if (!city || !trimmed) {
      return;
    }

    const knownLocality = this.localities.find(
      (locality) => locality.name.toLowerCase() === trimmed.toLowerCase(),
    );

    if (knownLocality) {
      this.localityGeocodeError.set(null);
      this.pendingAddJunction = false;
      this.applyLocalitySelection(knownLocality);
      return;
    }

    this.localityValidating.set(true);
    this.localityGeocodeError.set(null);

    this.locationsService.tryResolveLocality(city.name, trimmed).subscribe((locality) => {
      this.localityValidating.set(false);

      if (!locality) {
        this.localityGeocodeError.set(LOCALITY_GEOCODE_ERROR);
        return;
      }

      this.pendingAddJunction = true;
      this.applyLocalitySelection(locality);
    });
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    this.submitError.set(null);

    const city = this.selectedCity();
    const locality = this.selectedLocality();

    if (this.form.invalid || !city || !locality) {
      return;
    }

    const name = this.form.controls.name.value;

    if (!this.pendingAddJunction) {
      this.submitting.set(true);
      this.locationsService.resolveLocality(city.name, locality.name).subscribe((resolved) => {
        this.submitting.set(false);
        this.submitted.emit({
          name,
          city,
          locality: {
            ...locality,
            latitude: resolved.latitude,
            longitude: resolved.longitude,
          },
        });
      });
      return;
    }

    this.submitting.set(true);

    this.locationsService.addJunction(city.name, locality.name).subscribe({
      next: ({ city: syncedCity, locality: syncedLocality }) => {
        this.submitting.set(false);
        this.pendingAddJunction = false;
        this.submitted.emit({ name, city: syncedCity, locality: syncedLocality });
      },
      error: (error) => {
        this.submitting.set(false);
        this.submitError.set(this.resolveSubmitError(error));
      },
    });
  }

  private resolveSubmitError(error: {
    status?: number;
    error?: { detail?: string | { msg?: string }[] };
  }): string {
    if (error.status === 404) {
      return 'Unable to save your Junction right now. Please try again shortly.';
    }

    const detail = error.error?.detail;
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }

    if (Array.isArray(detail) && detail[0]?.msg) {
      return detail[0].msg;
    }

    return 'Unable to save your Junction. Please try again.';
  }

  private applyCitySelection(city: City): void {
    this.selectedCity.set(city);
    this.selectedLocality.set(null);
    this.localities = [];
    this.pendingAddJunction = false;
    this.submitError.set(null);
    this.closePicker();

    this.locationsService.resolveCityTarget(city.name).subscribe((target) => {
      this.locationPreview.emit(target);
    });

    this.localitiesLoading = true;
    this.locationsService.getLocalities(city.name).subscribe((localities) => {
      this.localities = localities;
      this.localitiesLoading = false;
    });
  }

  private applyLocalitySelection(locality: Locality): void {
    const city = this.selectedCity();
    if (!city) {
      return;
    }

    this.localityGeocodeError.set(null);
    this.selectedLocality.set(locality);
    this.closePicker();

    this.locationsService.resolveLocalityTarget(city.name, locality.name).subscribe((target) => {
      const current = this.selectedLocality();
      if (!current || current.name !== locality.name) {
        return;
      }

      this.selectedLocality.set({
        ...current,
        latitude: target.latitude,
        longitude: target.longitude,
      });
      this.locationPreview.emit(target);
    });
  }
}
