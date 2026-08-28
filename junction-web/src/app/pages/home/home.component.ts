import { Component, computed, effect, inject, signal } from '@angular/core';
import { City, Locality } from '../../models/location.model';
import { UserSessionService } from '../../services/user-session.service';
import { HeaderBarComponent } from '../../components/header-bar/header-bar.component';
import { MapComponent, MapTarget } from '../../components/map/map.component';
import { GreetComponent } from '../../components/greet/greet.component';
import { MarketplacePanelComponent } from '../../components/marketplace/marketplace-panel.component';
import { CartStore } from '../../stores/cart.store';

@Component({
  selector: 'app-home',
  imports: [MapComponent, GreetComponent, HeaderBarComponent, MarketplacePanelComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  readonly session = inject(UserSessionService);
  private readonly cart = inject(CartStore);
  private lastJunctionKey: string | null = null;

  readonly hasCompletedWelcome = this.session.hasCompletedWelcome;
  readonly marketplaceOpen = signal(false);
  readonly junctionPickerOpen = signal(false);
  private readonly previewTarget = signal<MapTarget | null>(null);

  constructor() {
    effect(() => {
      const junctionKey = this.session.junctionKey();
      if (!junctionKey) {
        return;
      }

      if (this.lastJunctionKey !== null && this.lastJunctionKey !== junctionKey) {
        this.marketplaceOpen.set(false);
        this.cart.clear();
      }

      this.lastJunctionKey = junctionKey;
    });
  }

  readonly mapTarget = computed<MapTarget | null>(() => {
    const profile = this.session.userProfile();
    if (profile) {
      return {
        latitude: profile.locality.latitude,
        longitude: profile.locality.longitude,
        label: this.session.junctionLabel(),
        zoom: profile.serviceScope === 'city' ? 12 : 15,
      };
    }

    return this.previewTarget();
  });

  onGreetSubmitted(event: { name: string; city: City; locality: Locality }): void {
    this.session.completeWelcome(event.name, event.city, event.locality, 'locality');
  }

  onCityServicesSelected(event: { name: string; city: City }): void {
    this.session.completeCityServices(event.name, event.city);
  }

  onJunctionPickerSubmitted(event: { name: string; city: City; locality: Locality }): void {
    const profile = this.session.userProfile();
    if (!profile) {
      return;
    }

    if (event.city.name !== profile.city.name) {
      this.session.updateCity(event.city, event.locality, 'locality');
    } else if (event.locality.name !== profile.locality.name) {
      this.session.updateLocality(event.locality);
      this.session.updateServiceScope('locality', event.locality);
    } else {
      this.session.updateServiceScope('locality', event.locality);
    }

    this.closeJunctionPicker();
  }

  onJunctionPickerCityServices(event: { name: string; city: City }): void {
    this.session.completeCityServices(event.name, event.city);
    this.closeJunctionPicker();
  }

  onLocationPreview(target: MapTarget): void {
    this.previewTarget.set(target);
  }

  openJunctionPicker(): void {
    this.junctionPickerOpen.set(true);
  }

  closeJunctionPicker(): void {
    this.junctionPickerOpen.set(false);
  }

  toggleMarketplace(): void {
    this.marketplaceOpen.update((open) => !open);
  }

  closeMarketplace(): void {
    this.marketplaceOpen.set(false);
  }
}
