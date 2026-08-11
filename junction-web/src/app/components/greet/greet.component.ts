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
  readonly selectedCityName = signal<string | null>(null);
  readonly selectedLocalityName = signal<string | null>(null);

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
    if (!this.selectedCityName()) {
      return;
    }

    this.activePicker.set('locality');
  }

  closePicker(): void {
    this.activePicker.set(null);
  }

  onCityPicked(cityName: string): void {
    this.selectedCityName.set(cityName);
    this.selectedLocalityName.set(null);
    this.localities = [];
    this.closePicker();

    this.locationsService.resolveCityTarget(cityName).subscribe((target) => {
      this.locationPreview.emit(target);
    });

    this.localitiesLoading = true;
    this.locationsService.getLocalities(cityName).subscribe((localities) => {
      this.localities = localities;
      this.localitiesLoading = false;
    });
  }

  onLocalityPicked(localityName: string): void {
    const cityName = this.selectedCityName();
    if (!cityName) {
      return;
    }

    this.selectedLocalityName.set(localityName);
    this.closePicker();

    this.locationsService.resolveLocalityTarget(cityName, localityName).subscribe((target) => {
      this.locationPreview.emit(target);
    });
  }

  onSubmit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid || !this.selectedCityName() || !this.selectedLocalityName()) {
      return;
    }

    const name = this.form.controls.name.value;
    const cityName = this.selectedCityName()!;
    const localityName = this.selectedLocalityName()!;
    const city = this.cities.find((item) => item.name === cityName);

    if (!city) {
      return;
    }

    this.locationsService.resolveLocality(cityName, localityName).subscribe((locality) => {
      this.submitted.emit({ name, city, locality });
    });
  }
}
