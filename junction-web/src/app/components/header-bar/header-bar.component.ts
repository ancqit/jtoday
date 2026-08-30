import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  effect,
  inject,
  output,
  signal,
} from '@angular/core';
import { City, Locality, UserProfile } from '../../models/location.model';
import { ProfileModalComponent } from '../profile-modal/profile-modal.component';
import {
  LocationPickerModalComponent,
  PickerOption,
} from '../location-picker-modal/location-picker-modal.component';
import { LocationsService } from '../../services/locations.service';
import { UserSessionService } from '../../services/user-session.service';

type ActivePicker = 'city' | 'locality' | null;

@Component({
  selector: 'app-header-bar',
  imports: [ProfileModalComponent, LocationPickerModalComponent],
  templateUrl: './header-bar.component.html',
  styleUrl: './header-bar.component.scss',
})
export class HeaderBarComponent implements OnInit {
  private readonly locationsService = inject(LocationsService);
  private readonly host = inject(ElementRef<HTMLElement>);
  readonly session = inject(UserSessionService);

  /** Emitted when the user taps their display name — parent should open greet. */
  readonly nameClicked = output<void>();

  cities: City[] = [];
  localities: Locality[] = [];
  localitiesLoading = false;
  readonly settingsOpen = signal(false);
  readonly profileModalOpen = signal(false);
  readonly activePicker = signal<ActivePicker>(null);
  readonly selectedCity = signal<City | null>(null);
  readonly selectedLocality = signal<Locality | null>(null);
  readonly applyingJunction = signal(false);
  private profileInitialized = false;

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
  }

  get cityPickerOptions(): PickerOption[] {
    return this.cities.map((city) => ({ id: city.id, label: city.name }));
  }

  get localityPickerOptions(): PickerOption[] {
    return this.localities.map((locality) => ({ id: locality.id, label: locality.name }));
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
    if (this.activePicker()) {
      this.closePicker();
      return;
    }

    if (this.profileModalOpen()) {
      this.profileModalOpen.set(false);
      return;
    }

    this.closeSettings();
  }

  onNameClick(): void {
    this.closeSettings();
    this.nameClicked.emit();
  }

  toggleSettings(): void {
    if (this.settingsOpen()) {
      this.closeSettings();
      return;
    }

    const profile = this.session.userProfile();
    if (profile) {
      this.syncFromProfile(profile);
    }

    this.settingsOpen.set(true);
  }

  closeSettings(): void {
    this.settingsOpen.set(false);
    const profile = this.session.userProfile();
    if (profile) {
      this.syncFromProfile(profile);
    }
  }

  openProfileModal(): void {
    this.settingsOpen.set(false);
    this.profileModalOpen.set(true);
  }

  closeProfileModal(): void {
    this.profileModalOpen.set(false);
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
    const city = this.cities.find((item) => item.name.toLowerCase() === cityName.trim().toLowerCase());
    if (!city) {
      return;
    }

    this.selectedCity.set(city);
    this.selectedLocality.set(null);
    this.localities = [];
    this.closePicker();

    this.localitiesLoading = true;
    this.locationsService.getLocalities(city.name).subscribe((localities) => {
      this.localities = localities;
      this.localitiesLoading = false;
    });
  }

  onLocalityPicked(localityName: string): void {
    const locality = this.localities.find(
      (item) => item.name.toLowerCase() === localityName.trim().toLowerCase(),
    );
    if (!locality) {
      return;
    }

    this.selectedLocality.set(locality);
    this.closePicker();
  }

  applyJunctionChange(): void {
    const city = this.selectedCity();
    const locality = this.selectedLocality();
    const profile = this.session.userProfile();

    if (!city || !locality || !profile) {
      return;
    }

    this.applyingJunction.set(true);

    this.locationsService.resolveLocality(city.name, locality.name).subscribe({
      next: (resolvedLocality) => {
        this.applyingJunction.set(false);

        if (city.name !== profile.city.name) {
          this.session.updateCity(city, resolvedLocality, 'locality');
        } else if (resolvedLocality.name !== profile.locality.name) {
          this.session.updateLocality(resolvedLocality);
          this.session.updateServiceScope('locality', resolvedLocality);
        } else {
          this.session.updateServiceScope('locality', resolvedLocality);
        }

        this.settingsOpen.set(false);
      },
      error: () => {
        this.applyingJunction.set(false);
      },
    });
  }

  private initializeFromProfile(profile: UserProfile): void {
    this.profileInitialized = true;
    this.syncFromProfile(profile);
  }

  private syncFromProfile(profile: UserProfile): void {
    this.selectedCity.set(profile.city);
    this.selectedLocality.set(profile.locality);

    this.localitiesLoading = true;
    this.locationsService.getLocalities(profile.city.name).subscribe((localities) => {
      this.localities = localities;
      this.localitiesLoading = false;

      const match = localities.find((item) => item.name === profile.locality.name);
      if (match) {
        this.selectedLocality.set(match);
      }
    });
  }
}
