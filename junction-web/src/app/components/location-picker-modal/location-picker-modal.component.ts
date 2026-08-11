import { Component, input, output } from '@angular/core';

export interface PickerOption {
  id: string;
  label: string;
}

@Component({
  selector: 'app-location-picker-modal',
  templateUrl: './location-picker-modal.component.html',
  styleUrl: './location-picker-modal.component.scss',
})
export class LocationPickerModalComponent {
  readonly title = input.required<string>();
  readonly options = input.required<PickerOption[]>();
  readonly loading = input(false);
  readonly emptyMessage = input('Nothing to show yet.');

  readonly picked = output<string>();
  readonly dismissed = output<void>();

  onPick(label: string): void {
    this.picked.emit(label);
  }

  onDismiss(): void {
    this.dismissed.emit();
  }
}
