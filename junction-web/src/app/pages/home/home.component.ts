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
  private readonly session = inject(UserSessionService);
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
      return {
        latitude: profile.locality.latitude,
        longitude: profile.locality.longitude,
        label: `${profile.locality.name}, ${profile.city.name}`,
        zoom: 15,
      };
    }

    return this.previewTarget();
  });

  onGreetSubmitted(event: { name: string; city: City; locality: Locality }): void {
    this.session.completeWelcome(event.name, event.city, event.locality);
  }

  onLocationPreview(target: MapTarget): void {
    this.previewTarget.set(target);
  }

  toggleMarketplace(): void {
    this.marketplaceOpen.update((open) => !open);
  }

  closeMarketplace(): void {
    this.marketplaceOpen.set(false);
  }
}
