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
  readonly locationPreview = output<{ latitude: number; longitude: number; label: string }>();

  cities: City[] = [];
  localities: Locality[] = [];

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    cityName: ['', Validators.required],
    localityName: ['', Validators.required],
  });

  ngOnInit(): void {
    this.locationsService.getCities().subscribe((cities) => {
      this.cities = cities;
    });

    this.form.controls.cityName.valueChanges.subscribe((cityName) => {
      this.form.controls.localityName.setValue('');
      this.localities = [];

      if (!cityName) {
        return;
      }

      const city = this.cities.find((item) => item.name === cityName);
      if (city) {
        this.locationPreview.emit({
          latitude: city.latitude,
          longitude: city.longitude,
          label: city.name,
        });
      }

      this.locationsService.getLocalities(cityName).subscribe((localities) => {
        this.localities = localities;
      });
    });

    this.form.controls.localityName.valueChanges.subscribe((localityName) => {
      const city = this.cities.find((item) => item.name === this.form.controls.cityName.value);
      const locality = this.localities.find((item) => item.name === localityName);

      if (!city || !locality) {
        return;
      }

      this.locationPreview.emit({
        latitude: locality.latitude,
        longitude: locality.longitude,
        label: `${locality.name}, ${city.name}`,
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
    const locality = this.localities.find((item) => item.name === localityName);

    if (!city || !locality) {
      return;
    }

    this.submitted.emit({ name, city, locality });
  }
}
