import { Component, OnInit, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { City, Locality } from '../../models/location.model';
import { LocationsService } from '../../services/locations.service';
import {
  LocationPickerModalComponent,
  PickerOption,
} from '../location-picker-modal/location-picker-modal.component';

type ActivePicker = 'city' | 'locality' | null;

@Component({
  selector: 'app-greet',
  imports: [ReactiveFormsModule, LocationPickerModalComponent],
  templateUrl: './greet.component.html',
  styleUrl: './greet.component.scss',
})
export class GreetComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly locationsService = inject(LocationsService);

  readonly submitted = output<{ name: string; city: City; locality: Locality }>();
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

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
  });

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

  openCityPicker(): void {
    this.activePicker.set('city');
  }

  openLocalityPicker(): void {
    if (!this.selectedCity() || this.localitiesLoading) {
      return;
    }

    this.activePicker.set('locality');
  }

  closePicker(): void {
    this.activePicker.set(null);
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
      this.applyLocalitySelection(knownLocality);
      return;
    }

    this.locationsService.resolveLocality(city.name, trimmed).subscribe((locality) => {
      this.applyLocalitySelection(locality);
    });
  }

  onSubmit(): void {
    this.form.markAllAsTouched();

    const city = this.selectedCity();
    const locality = this.selectedLocality();

    if (this.form.invalid || !city || !locality) {
      return;
    }

    this.submitted.emit({
      name: this.form.controls.name.value,
      city,
      locality,
    });
  }

  private applyCitySelection(city: City): void {
    this.selectedCity.set(city);
    this.selectedLocality.set(null);
    this.localities = [];
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

    this.selectedLocality.set(locality);
    this.closePicker();

    this.locationsService.resolveLocalityTarget(city.name, locality.name).subscribe((target) => {
      this.locationPreview.emit(target);
    });
  }
}
