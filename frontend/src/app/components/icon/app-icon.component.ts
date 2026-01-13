import { Component, Input, ChangeDetectionStrategy, ViewEncapsulation, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Sparkles, Check, Circle, Star, Heart, Info, LayoutDashboard, Settings, LogOut, Moon, CalendarHeart, Calendar, Folder, MessageCircle, Bell, Eye, EyeOff, X, ChevronLeft, ChevronRight, ArrowLeft, ArrowRight } from 'lucide-angular';

/**
 * Composant wrapper pour utiliser les icônes Lucide
 * Utilise lucide-angular avec l'approche standalone
 */
@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './app-icon.component.html',
  styleUrl: './app-icon.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class AppIconComponent {
  @Input({ required: true }) name!: string;
  @Input() size: number = 20;
  @Input() strokeWidth: number = 2;
  @Input() color?: string;
  @Input() class: string = '';

  @HostBinding('style.--icon-size')
  get iconSize(): string {
    return `${this.size}px`;
  }

  // Mapping des noms d'icônes vers les composants Lucide
  private iconMap: Record<string, any> = {
    sparkles: Sparkles,
    check: Check,
    circle: Circle,
    star: Star,
    heart: Heart,
    info: Info,
    information: Info,
    dashboard: LayoutDashboard,
    'layout-dashboard': LayoutDashboard,
    settings: Settings,
    logout: LogOut,
    'log-out': LogOut,
    moon: Moon,
    'calendar-heart': CalendarHeart,
    calendarheart: CalendarHeart,
    calendar: Calendar,
    folder: Folder,
    'message-circle': MessageCircle,
    messagecircle: MessageCircle,
    bell: Bell,
    eye: Eye,
    'eye-off': EyeOff,
    eyeoff: EyeOff,
    x: X,
    close: X,
    'chevron-left': ChevronLeft,
    chevronleft: ChevronLeft,
    'chevron-right': ChevronRight,
    chevronright: ChevronRight,
    'arrow-left': ArrowLeft,
    arrowleft: ArrowLeft,
    'arrow-right': ArrowRight,
    arrowright: ArrowRight,
  };

  get iconComponent(): any {
    return this.iconMap[this.name.toLowerCase()];
  }
}

