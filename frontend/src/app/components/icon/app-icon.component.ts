import { Component, Input, ChangeDetectionStrategy, ViewEncapsulation, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Sparkles, Check, Circle, Star, Heart, Info, LayoutDashboard, Settings, LogOut, Moon, CalendarHeart, Calendar, Folder, MessageCircle, Bell, Eye, EyeOff, X, Menu, ChevronLeft, ChevronRight, ChevronDown, ArrowLeft, ArrowRight, Upload, Download, FileText, Image, User, Edit2, Save, XCircle, Mars, Venus, VenusAndMars, ClipboardCheck, Clock, Sun, Mic, Play, Pause, Square, Trash2, PersonStanding, Globe } from 'lucide-angular';

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
  /** Classes sur le host (ex. nav-arrow) — pas sur lucide-icon interne */
  @Input() class: string = '';

  @HostBinding('class')
  get hostClass(): string {
    return this.class;
  }

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
    sun: Sun,
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
    'chevron-down': ChevronDown,
    chevrondown: ChevronDown,
    'arrow-left': ArrowLeft,
    arrowleft: ArrowLeft,
    'arrow-right': ArrowRight,
    arrowright: ArrowRight,
    upload: Upload,
    download: Download,
    file: FileText,
    filetext: FileText,
    'file-text': FileText,
    image: Image,
    user: User,
    edit: Edit2,
    edit2: Edit2,
    save: Save,
    'x-circle': XCircle,
    xcircle: XCircle,
    mars: Mars,
    venus: Venus,
    'venus-and-mars': VenusAndMars,
    venusandmars: VenusAndMars,
    'gender-neutral': VenusAndMars,
    genderneutral: VenusAndMars,
    'clipboard-check': ClipboardCheck,
    clipboardcheck: ClipboardCheck,
    clipboard: ClipboardCheck,
    clock: Clock,
    mic: Mic,
    microphone: Mic,
    play: Play,
    pause: Pause,
    square: Square,
    stop: Square,
    trash: Trash2,
    'trash-2': Trash2,
    delete: Trash2,
    'person-standing': PersonStanding,
    globe: Globe,
    site: Globe,
    menu: Menu,
    hamburger: Menu,
  };

  get iconComponent(): any {
    return this.iconMap[this.name.toLowerCase()];
  }
}

