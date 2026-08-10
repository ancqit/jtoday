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
    cityId: ['', Validators.required],
    localityId: ['', Validators.required],
  });

  ngOnInit(): void {
    this.locationsService.getCities().subscribe((cities) => {
      this.cities = cities;
    });

    this.form.controls.cityId.valueChanges.subscribe((cityId) => {
      this.form.controls.localityId.setValue('');
      this.localities = [];

      if (!cityId) {
        return;
      }

      const city = this.cities.find((item) => item.id === cityId);
      if (city) {
        this.locationPreview.emit({
          latitude: city.latitude,
          longitude: city.longitude,
          label: city.name,
        });
      }

      this.locationsService.getLocalities(cityId).subscribe((localities) => {
        this.localities = localities;
      });
    });

    this.form.controls.localityId.valueChanges.subscribe((localityId) => {
      const city = this.cities.find((item) => item.id === this.form.controls.cityId.value);
      const locality = this.localities.find((item) => item.id === localityId);

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

    const { name, cityId, localityId } = this.form.getRawValue();
    const city = this.cities.find((item) => item.id === cityId);
    const locality = this.localities.find((item) => item.id === localityId);

    if (!city || !locality) {
      return;
    }

    this.submitted.emit({ name, city, locality });
  }
}
