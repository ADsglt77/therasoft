import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostBinding,
  Input,
  OnDestroy,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AppIconComponent } from '../../icon/app-icon.component';

/** Largeur en dessous de laquelle le libellé est masqué (icône seule). */
const LABEL_HIDE_WIDTH_PX = 72;

@Component({
  selector: 'app-navbar-links',
  standalone: true,
  imports: [CommonModule, RouterModule, AppIconComponent],
  templateUrl: './navbar-links.component.html',
  styleUrl: './navbar-links.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarLinksComponent implements AfterViewInit, OnDestroy {
  @Input() icon!: string;
  @Input() text!: string;
  @Input() route?: string;
  @Input() exact = false;
  @Input() iconOnly = false;
  @Input() action?: () => void;
  @Output() click = new EventEmitter<void>();

  @HostBinding('class.navbar-links')
  readonly hostClass = true;

  private compact = false;
  private resizeObserver?: ResizeObserver;

  constructor(
    private hostRef: ElementRef<HTMLElement>,
    private cdr: ChangeDetectorRef
  ) {}

  @HostBinding('class.icon-only')
  get isIconOnly(): boolean {
    return this.iconOnly || this.compact;
  }

  ngAfterViewInit(): void {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    this.resizeObserver = new ResizeObserver(([entry]) => {
      const nextCompact = entry.contentRect.width < LABEL_HIDE_WIDTH_PX;
      if (nextCompact !== this.compact) {
        this.compact = nextCompact;
        this.cdr.markForCheck();
      }
    });
    this.resizeObserver.observe(this.hostRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  onClick(event: Event): void {
    if (!this.route) {
      event.preventDefault();
    }
    if (this.action) {
      event.stopPropagation();
      this.action();
    }
    this.click.emit();
    (event.currentTarget as HTMLElement)?.blur();
  }
}

