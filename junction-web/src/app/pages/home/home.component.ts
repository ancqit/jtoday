import { Component, computed, inject, signal } from '@angular/core';
import { City, Locality } from '../../models/location.model';
import { UserSessionService } from '../../services/user-session.service';
import { HeaderBarComponent } from '../../components/header-bar/header-bar.component';
import { MapComponent } from '../../components/map/map.component';
import { WelcomeModalComponent } from '../../components/welcome-modal/welcome-modal.component';

@Component({
  selector: 'app-home',
  imports: [MapComponent, WelcomeModalComponent, HeaderBarComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly session = inject(UserSessionService);

  readonly hasCompletedWelcome = this.session.hasCompletedWelcome;
  private readonly previewTarget = signal<{ latitude: number; longitude: number; label: string } | null>(
    null,
  );

  readonly mapTarget = computed(() => {
    const profile = this.session.userProfile();
    if (profile) {
      return {
        latitude: profile.locality.latitude,
        longitude: profile.locality.longitude,
        label: `${profile.locality.name}, ${profile.city.name}`,
      };
    }

    return this.previewTarget();
  });

  onWelcomeSubmitted(event: { name: string; city: City; locality: Locality }): void {
    this.session.completeWelcome(event.name, event.city, event.locality);
  }

  onLocationPreview(target: { latitude: number; longitude: number; label: string }): void {
    this.previewTarget.set(target);
  }
}
