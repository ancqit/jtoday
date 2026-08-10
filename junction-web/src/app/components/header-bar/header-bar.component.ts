import { Component, OnInit, effect, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { City, Locality, UserProfile } from '../../models/location.model';
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
  private profileInitialized = false;

  readonly form = this.fb.nonNullable.group({
    cityName: [''],
    localityName: [{ value: '', disabled: true }],
  });

  constructor() {
    effect(() => {
      if (!this.session.hasCompletedWelcome()) {
        return;
      }

      const profile = this.session.userProfile();
      if (!profile || this.cities.length === 0 || this.profileInitialized) {
        return;
      }

      this.initializeFromProfile(profile);
    });
  }

  ngOnInit(): void {
    this.locationsService.getCities().subscribe((cities) => {
      this.cities = cities;

      const profile = this.session.userProfile();
      if (profile && !this.profileInitialized) {
        this.initializeFromProfile(profile);
      }
    });

    this.form.controls.cityName.valueChanges.subscribe((cityName) => {
      this.setLocalityEnabled(false);
      this.form.controls.localityName.setValue('', { emitEvent: false });
      this.localities = [];

      if (!cityName) {
        return;
      }

      this.locationsService.getLocalities(cityName).subscribe((localities) => {
        this.localities = localities;
        this.setLocalityEnabled(localities.length > 0);
      });
    });

    this.form.controls.localityName.valueChanges.subscribe((localityName) => {
      if (!localityName) {
        return;
      }

      const city = this.cities.find((item) => item.name === this.form.controls.cityName.value);
      const locality = this.localities.find((item) => item.name === localityName);
      const profile = this.session.userProfile();

      if (!city || !locality || !profile) {
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

  private initializeFromProfile(profile: UserProfile): void {
    this.profileInitialized = true;
    this.form.controls.cityName.setValue(profile.city.name, { emitEvent: false });

    this.locationsService.getLocalities(profile.city.name).subscribe((localities) => {
      this.localities = localities;
      this.form.controls.localityName.setValue(profile.locality.name, { emitEvent: false });
      this.setLocalityEnabled(localities.length > 0);
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
