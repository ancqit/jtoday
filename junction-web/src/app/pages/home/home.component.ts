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

    return this.previewTarget();
  });

  onGreetSubmitted(event: { name: string; city: City; locality: Locality }): void {
    this.session.completeWelcome(event.name, event.city, event.locality, 'locality');
  }

  onLocationPreview(target: MapTarget): void {
    this.previewTarget.set(target);
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
