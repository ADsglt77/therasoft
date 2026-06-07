import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { Subject, Subscription, debounceTime, distinctUntilChanged, of, switchMap, catchError } from 'rxjs';
import { AppIconComponent } from '../icon/app-icon.component';
import { InputMessageType } from '../input/ui-input.component';
import { AuthService, AddressSuggestion } from '../../core/services/auth.service';

/**
 * Champ d'adresse avec autocomplétion (API Adresse gouv.fr via le backend).
 * Émet le libellé saisi/choisi (`valueChange`) et la suggestion complète (`selected`).
 */
@Component({
  selector: 'app-address-autocomplete',
  standalone: true,
  imports: [AppIconComponent],
  templateUrl: './address-autocomplete.component.html',
  styleUrl: './address-autocomplete.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressAutocompleteComponent implements OnInit, OnDestroy {
  @Input() value = '';
  @Input() label = '';
  @Input() id = 'address';
  @Input() placeholder = 'Rechercher votre adresse…';
  @Input() required = false;
  @Input() message = '';
  @Input() messageType: InputMessageType | '' = '';
  @Output() valueChange = new EventEmitter<string>();
  @Output() selected = new EventEmitter<AddressSuggestion>();

  suggestions: AddressSuggestion[] = [];
  isOpen = false;

  private readonly query$ = new Subject<string>();
  private sub?: Subscription;

  constructor(
    private readonly authService: AuthService,
    private readonly el: ElementRef<HTMLElement>,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.sub = this.query$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) =>
          q.trim().length < 3
            ? of([] as AddressSuggestion[])
            : this.authService.searchAddresses(q).pipe(catchError(() => of([] as AddressSuggestion[])))
        )
      )
      .subscribe((list) => {
        this.suggestions = list;
        this.isOpen = list.length > 0;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.value = value;
    this.valueChange.emit(value);
    this.query$.next(value);
  }

  onFocus(): void {
    if (this.suggestions.length > 0) {
      this.isOpen = true;
    }
  }

  select(suggestion: AddressSuggestion): void {
    this.value = suggestion.label;
    this.valueChange.emit(suggestion.label);
    this.selected.emit(suggestion);
    this.suggestions = [];
    this.isOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target as Node)) {
      this.isOpen = false;
    }
  }
}
