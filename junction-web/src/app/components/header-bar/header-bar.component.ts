import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { City, Locality } from '../../models/location.model';
import { LocationsService } from '../../services/locations.service';
import { UserSessionService } from '../../services/user-session.service';

@Component({
  selector: 'app-header-bar',
  imports: [ReactiveFormsModule],
  templateUrl: './header-bar.component.html',
  styleUrl: './header-bar.component.scss',
})
export class HeaderBarComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly locationsService = inject(LocationsService);
  readonly session = inject(UserSessionService);

  cities: City[] = [];
  localities: Locality[] = [];

  readonly form = this.fb.nonNullable.group({
    cityName: [''],
    localityName: [''],
  });

  ngOnInit(): void {
    this.locationsService.getCities().subscribe((cities) => {
      this.cities = cities;
      this.syncFormFromSession();
    });

    this.form.controls.cityName.valueChanges.subscribe((cityName) => {
      if (!cityName) {
        this.localities = [];
        return;
      }

      this.locationsService.getLocalities(cityName).subscribe((localities) => {
        this.localities = localities;
        const profile = this.session.userProfile();
        if (profile?.city.name === cityName) {
          this.form.controls.localityName.setValue(profile.locality.name, { emitEvent: false });
        }
      });
    });

    this.form.controls.localityName.valueChanges.subscribe((localityName) => {
      const profile = this.session.userProfile();
      if (!profile || !localityName) {
        return;
      }

      const city = this.cities.find((item) => item.name === this.form.controls.cityName.value);
      const locality = this.localities.find((item) => item.name === localityName);

      if (!city || !locality) {
        return;
      }

      if (city.name !== profile.city.name) {
        this.session.updateCity(city, locality);
        return;
      }

      if (locality.name !== profile.locality.name) {
        this.session.updateLocality(locality);
      }
    });
  }

  private syncFormFromSession(): void {
    const profile = this.session.userProfile();
    if (!profile) {
      return;
    }

    this.form.patchValue(
      {
        cityName: profile.city.name,
        localityName: profile.locality.name,
      },
      { emitEvent: false },
    );

    this.locationsService.getLocalities(profile.city.name).subscribe((localities) => {
      this.localities = localities;
    });
  }
}
