import { Component, computed, inject, signal } from '@angular/core';
import { City, Locality } from '../../models/location.model';
import { UserSessionService } from '../../services/user-session.service';
import { HeaderBarComponent } from '../../components/header-bar/header-bar.component';
import { MapComponent, MapTarget } from '../../components/map/map.component';
import { GreetComponent } from '../../components/greet/greet.component';

@Component({
  selector: 'app-home',
  imports: [MapComponent, GreetComponent, HeaderBarComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly session = inject(UserSessionService);

  readonly hasCompletedWelcome = this.session.hasCompletedWelcome;
  private readonly previewTarget = signal<MapTarget | null>(null);

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
}
