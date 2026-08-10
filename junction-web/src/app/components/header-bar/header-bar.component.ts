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
    cityId: [''],
    localityId: [''],
  });

  ngOnInit(): void {
    this.locationsService.getCities().subscribe((cities) => {
      this.cities = cities;
      this.syncFormFromSession();
    });

    this.form.controls.cityId.valueChanges.subscribe((cityId) => {
      if (!cityId) {
        this.localities = [];
        return;
      }

      this.locationsService.getLocalities(cityId).subscribe((localities) => {
        this.localities = localities;
        const profile = this.session.userProfile();
        if (profile?.city.id === cityId) {
          this.form.controls.localityId.setValue(profile.locality.id, { emitEvent: false });
        }
      });
    });

    this.form.controls.localityId.valueChanges.subscribe((localityId) => {
      const profile = this.session.userProfile();
      if (!profile || !localityId) {
        return;
      }

      const city = this.cities.find((item) => item.id === this.form.controls.cityId.value);
      const locality = this.localities.find((item) => item.id === localityId);

      if (!city || !locality) {
        return;
      }

      if (city.id !== profile.city.id) {
        this.session.updateCity(city, locality);
        return;
      }

      if (locality.id !== profile.locality.id) {
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
        cityId: profile.city.id,
        localityId: profile.locality.id,
      },
      { emitEvent: false },
    );

    this.locationsService.getLocalities(profile.city.id).subscribe((localities) => {
      this.localities = localities;
    });
  }
}
