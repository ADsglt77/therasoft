import { ChangeDetectionStrategy, Component, HostBinding, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AppIconComponent } from '../../icon/app-icon.component';

@Component({
  selector: 'app-navbar-links',
  standalone: true,
  imports: [CommonModule, RouterModule, AppIconComponent],
  templateUrl: './navbar-links.component.html',
  styleUrl: './navbar-links.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarLinksComponent {
  @Input() icon!: string;
  @Input() text!: string;
  @Input() route?: string;
  @Input() action?: () => void;
  @Output() click = new EventEmitter<void>();

  @HostBinding('class')
  get hostClasses(): string {
    return 'navbar-links';
  }

  onClick(event: Event): void {
    if (this.action) {
      event.preventDefault();
      event.stopPropagation();
      this.action();
    }
    this.click.emit();
  }
}

