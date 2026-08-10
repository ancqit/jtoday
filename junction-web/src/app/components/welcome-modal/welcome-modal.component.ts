import { Component, OnInit, inject, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { City, Locality } from '../../models/location.model';
import { LocationsService } from '../../services/locations.service';

@Component({
  selector: 'app-welcome-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './welcome-modal.component.html',
  styleUrl: './welcome-modal.component.scss',
})
export class WelcomeModalComponent implements OnInit {
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

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    cityName: ['', Validators.required],
    localityName: [{ value: '', disabled: true }, Validators.required],
  });

  ngOnInit(): void {
    this.locationsService.getCities().subscribe((cities) => {
      this.cities = cities;
    });

    this.form.controls.cityName.valueChanges.subscribe((cityName) => {
      this.setLocalityEnabled(false);
      this.form.controls.localityName.setValue('', { emitEvent: false });
      this.localities = [];

      if (!cityName) {
        this.localitiesLoading = false;
        return;
      }

      this.locationsService.resolveCityTarget(cityName).subscribe((target) => {
        this.locationPreview.emit(target);
      });

      this.localitiesLoading = true;
      this.locationsService.getLocalities(cityName).subscribe((localities) => {
        this.localities = localities;
        this.localitiesLoading = false;
        this.setLocalityEnabled(localities.length > 0);
      });
    });

    this.form.controls.localityName.valueChanges.subscribe((localityName) => {
      const cityName = this.form.controls.cityName.value;
      if (!cityName || !localityName) {
        return;
      }

      this.locationsService.resolveLocalityTarget(cityName, localityName).subscribe((target) => {
        this.locationPreview.emit(target);
      });
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, cityName, localityName } = this.form.getRawValue();
    const city = this.cities.find((item) => item.name === cityName);

    if (!city || !localityName) {
      return;
    }

    this.locationsService.resolveLocality(cityName, localityName).subscribe((locality) => {
      this.submitted.emit({ name, city, locality });
    });
  }

  private setLocalityEnabled(enabled: boolean): void {
    const control = this.form.controls.localityName;

    if (enabled) {
      control.enable({ emitEvent: false });
      return;
    }

    control.disable({ emitEvent: false });
  }
}
