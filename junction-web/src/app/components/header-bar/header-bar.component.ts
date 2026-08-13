import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { City, Locality, UserProfile } from '../../models/location.model';
import { ProfileModalComponent } from '../profile-modal/profile-modal.component';
import { LocationsService } from '../../services/locations.service';
import { UserSessionService } from '../../services/user-session.service';

@Component({
  selector: 'app-header-bar',
  imports: [ReactiveFormsModule, ProfileModalComponent],
  templateUrl: './header-bar.component.html',
  styleUrl: './header-bar.component.scss',
})
export class HeaderBarComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly locationsService = inject(LocationsService);
  private readonly host = inject(ElementRef<HTMLElement>);
  readonly session = inject(UserSessionService);

  cities: City[] = [];
  localities: Locality[] = [];
  localitiesLoading = false;
  readonly settingsOpen = signal(false);
  readonly profileModalOpen = signal(false);
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
        this.localitiesLoading = false;
        return;
      }

      this.localitiesLoading = true;
      this.locationsService.getLocalities(cityName).subscribe((localities) => {
        this.localities = localities;
        this.localitiesLoading = false;
        this.setLocalityEnabled(localities.length > 0);
      });
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.settingsOpen()) {
      return;
    }

    const target = event.target;
    if (target instanceof Node && !this.host.nativeElement.contains(target)) {
      this.closeSettings();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.profileModalOpen()) {
      this.profileModalOpen.set(false);
      return;
    }

    this.closeSettings();
  }

  toggleSettings(): void {
    if (this.settingsOpen()) {
      this.closeSettings();
      return;
    }

    const profile = this.session.userProfile();
    if (profile) {
      this.syncFormFromProfile(profile);
    }

    this.settingsOpen.set(true);
  }

  closeSettings(): void {
    this.settingsOpen.set(false);
    const profile = this.session.userProfile();
    if (profile) {
      this.syncFormFromProfile(profile);
    }
  }

  openProfileModal(): void {
    this.settingsOpen.set(false);
    this.profileModalOpen.set(true);
  }

  closeProfileModal(): void {
    this.profileModalOpen.set(false);
  }

  applyJunctionChange(): void {
    const { cityName, localityName } = this.form.getRawValue();
    const city = this.cities.find((item) => item.name === cityName);

    if (!city || !localityName) {
      return;
    }

    this.locationsService.resolveLocality(cityName, localityName).subscribe((locality) => {
      const profile = this.session.userProfile();
      if (!profile) {
        return;
      }

      if (city.name !== profile.city.name) {
        this.session.updateCity(city, locality);
      } else if (locality.name !== profile.locality.name) {
        this.session.updateLocality(locality);
      }

      this.settingsOpen.set(false);
    });
  }

  private initializeFromProfile(profile: UserProfile): void {
    this.profileInitialized = true;
    this.syncFormFromProfile(profile);
  }

  private syncFormFromProfile(profile: UserProfile): void {
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
