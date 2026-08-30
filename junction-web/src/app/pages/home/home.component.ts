import { Component, computed, effect, inject, signal } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { City, Locality } from '../../models/location.model';
import { UserSessionService } from '../../services/user-session.service';
import { HeaderBarComponent } from '../../components/header-bar/header-bar.component';
import { MapComponent, MapTarget } from '../../components/map/map.component';
import { GreetComponent } from '../../components/greet/greet.component';
import { MarketplacePanelComponent } from '../../components/marketplace/marketplace-panel.component';
import { CartStore } from '../../stores/cart.store';

@Component({
  selector: 'app-home',
  imports: [MapComponent, GreetComponent, HeaderBarComponent, MarketplacePanelComponent, TranslatePipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  readonly session = inject(UserSessionService);
  private readonly cart = inject(CartStore);
  private lastLocationKey: string | null = null;

  readonly hasCompletedWelcome = this.session.hasCompletedWelcome;
  readonly marketplaceOpen = signal(false);
  readonly greetOpen = signal(false);
  private readonly previewTarget = signal<MapTarget | null>(null);

  constructor() {
    // Only reset cart/marketplace when city or locality changes — not when
    // toggling locality ↔ city scope (Shops/Services vs City Junction).
    effect(() => {
      const locationKey = this.session.locationKey();
      if (!locationKey) {
        return;
      }

      if (this.lastLocationKey !== null && this.lastLocationKey !== locationKey) {
        this.marketplaceOpen.set(false);
        this.cart.clear();
      }

      this.lastLocationKey = locationKey;
    });
  }

  readonly mapTarget = computed<MapTarget | null>(() => {
    const preview = this.previewTarget();
    const greetActive = !this.hasCompletedWelcome() || this.greetOpen();
    // While greet is open, prefer live city/locality picks so the map pans.
    if (greetActive && preview) {
      return preview;
    }

    const profile = this.session.userProfile();
    if (profile) {
      const scope = profile.serviceScope ?? 'locality';
      const latitude =
        scope === 'city' ? profile.city.latitude : profile.locality.latitude;
      const longitude =
        scope === 'city' ? profile.city.longitude : profile.locality.longitude;
      return {
        latitude,
        longitude,
        label: this.session.junctionLabel(),
        zoom: scope === 'city' ? 12 : 15,
      };
    }

    return preview;
  });

  onGreetSubmitted(event: { name: string; city: City; locality: Locality }): void {
    this.session.completeWelcome(event.name, event.city, event.locality, 'locality');
    this.greetOpen.set(false);
  }

  onLocationPreview(target: MapTarget): void {
    this.previewTarget.set(target);
  }

  openGreet(): void {
    this.greetOpen.set(true);
  }

  closeGreet(): void {
    if (!this.hasCompletedWelcome()) {
      return;
    }
    this.greetOpen.set(false);
  }

  openLocalityServices(): void {
    if (this.marketplaceOpen() && this.session.serviceScope() === 'locality') {
      this.closeMarketplace();
      return;
    }

    this.session.updateServiceScope('locality');
    this.marketplaceOpen.set(true);
  }

  openCityServices(): void {
    if (this.marketplaceOpen() && this.session.serviceScope() === 'city') {
      this.closeMarketplace();
      return;
    }

    this.session.updateServiceScope('city');
    this.marketplaceOpen.set(true);
  }

  closeMarketplace(): void {
    this.marketplaceOpen.set(false);
  }
}
