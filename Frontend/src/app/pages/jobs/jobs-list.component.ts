import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { JobService, JobFilters } from '../../core/services/job.service';
import { JobCardComponent } from '../../shared/job-card.component';
import { SpinnerComponent } from '../../shared/spinner.component';
import { JobListItem } from '../../core/models/models';
import { CONTRACT_OPTIONS, EXPERIENCE_OPTIONS, WORKMODE_OPTIONS } from '../../core/models/labels';
import { debounceTime } from 'rxjs';

/**
 * Liste des offres : recherche plein texte, filtres (contrat, expérience,
 * mode de travail, lieu) et pagination côté client (l'API renvoie un tableau).
 */
@Component({
  selector: 'app-jobs-list',
  standalone: true,
  imports: [ReactiveFormsModule, JobCardComponent, SpinnerComponent],
  template: `
    <div class="page">
      <div class="container">
        <div class="page-head">
          <h1>Offres d'emploi</h1>
          <p class="sub">{{ filtered().length }} offre{{ filtered().length > 1 ? 's' : '' }} correspondent à votre recherche.</p>
        </div>

        <!-- Barre de recherche + filtres -->
        <div class="card filters">
          <form [formGroup]="filterForm">
            <div class="filters-main">
              <div class="input-icon flex-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8"/><path d="M20 20l-3-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                <input formControlName="search" class="form-control" placeholder="Métier, mot-clé, entreprise…">
              </div>
              <div class="input-icon loc">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 21s-7-5.5-7-11a7 7 0 1114 0c0 5.5-7 11-7 11z" stroke="currentColor" stroke-width="1.8"/></svg>
                <input formControlName="location" class="form-control" placeholder="Ville / lieu">
              </div>
              <button type="button" class="btn btn-ghost filters-toggle" (click)="showFilters.set(!showFilters())">
                ⚙️ Filtres
              </button>
            </div>

            @if (showFilters()) {
              <div class="filters-extra fade-in">
                <select formControlName="contract_type" class="form-control">
                  <option value="">Tous les contrats</option>
                  @for (o of contracts; track o.value) { <option [value]="o.value">{{ o.label }}</option> }
                </select>
                <select formControlName="experience" class="form-control">
                  <option value="">Toute expérience</option>
                  @for (o of experiences; track o.value) { <option [value]="o.value">{{ o.label }}</option> }
                </select>
                <select formControlName="work_mode" class="form-control">
                  <option value="">Tous les modes</option>
                  @for (o of workmodes; track o.value) { <option [value]="o.value">{{ o.label }}</option> }
                </select>
                <button type="button" class="btn btn-outline" (click)="reset()">Réinitialiser</button>
              </div>
            }
          </form>
        </div>

        <!-- Résultats -->
        @if (loading()) {
          <app-spinner message="Chargement des offres…" />
        } @else if (filtered().length === 0) {
          <div class="empty-state card mt-3">
            <div class="icon">🔍</div>
            <h3>Aucune offre trouvée</h3>
            <p>Essayez d'élargir vos critères ou de réinitialiser les filtres.</p>
            <button class="btn btn-outline mt-2" (click)="reset()">Réinitialiser la recherche</button>
          </div>
        } @else {
          <div class="grid grid-3 mt-3">
            @for (job of paged(); track job.id) { <app-job-card [job]="job" /> }
          </div>

          <!-- Pagination -->
          @if (totalPages() > 1) {
            <div class="pagination">
              <button class="page-btn" [disabled]="page() === 1" (click)="go(page() - 1)">‹ Précédent</button>
              @for (p of pages(); track p) {
                <button class="page-btn" [class.active]="p === page()" (click)="go(p)">{{ p }}</button>
              }
              <button class="page-btn" [disabled]="page() === totalPages()" (click)="go(page() + 1)">Suivant ›</button>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .filters { padding: 18px; }
    .filters-main { display: flex; gap: 12px; align-items: center; }
    .loc { width: 220px; }
    .filters-toggle { white-space: nowrap; }
    .filters-extra { display: grid; grid-template-columns: repeat(3, 1fr) auto; gap: 12px; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--gray-100); }
    .pagination { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; margin-top: 36px; }
    .page-btn { min-width: 40px; height: 40px; padding: 0 12px; border: 1.5px solid var(--gray-200); background: #fff; border-radius: 10px; font-weight: 600; color: var(--gray-700); cursor: pointer; transition: .15s; font-family: inherit; }
    .page-btn:hover:not(:disabled) { border-color: var(--blue-400); color: var(--blue-700); }
    .page-btn.active { background: var(--blue-600); border-color: var(--blue-600); color: #fff; }
    .page-btn:disabled { opacity: .45; cursor: not-allowed; }
    @media (max-width: 760px) { .filters-main { flex-wrap: wrap; } .loc { width: 100%; } .filters-extra { grid-template-columns: 1fr 1fr; } }
  `],
})
export class JobsListComponent implements OnInit {
  private jobService = inject(JobService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  contracts = CONTRACT_OPTIONS;
  experiences = EXPERIENCE_OPTIONS;
  workmodes = WORKMODE_OPTIONS;

  loading = signal(true);
  showFilters = signal(false);
  jobs = signal<JobListItem[]>([]);
  page = signal(1);
  pageSize = 9;

  filterForm = this.fb.nonNullable.group({
    search: '',
    location: '',
    contract_type: '',
    experience: '',
    work_mode: '',
  });

  /** Filtrage appliqué localement (recherche réactive). */
  filtered = computed(() => {
    const f = this.formValue();
    return this.jobs().filter((j) => {
      const matchSearch = !f.search ||
        (j.title + ' ' + j.company_name).toLowerCase().includes(f.search.toLowerCase());
      const matchLoc = !f.location || (j.location ?? '').toLowerCase().includes(f.location.toLowerCase());
      const matchContract = !f.contract_type || j.contract_type === f.contract_type;
      const matchExp = !f.experience || j.experience_level === f.experience;
      const matchMode = !f.work_mode || j.work_mode === f.work_mode;
      return matchSearch && matchLoc && matchContract && matchExp && matchMode;
    });
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  pages = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  private formValue = signal(this.filterForm.getRawValue());

  ngOnInit(): void {
    // Pré-remplissage depuis l'URL (?search=...)
    const q = this.route.snapshot.queryParamMap;
    this.filterForm.patchValue({
      search: q.get('search') ?? '',
      location: q.get('location') ?? '',
      contract_type: q.get('contract_type') ?? '',
      experience: q.get('experience') ?? '',
      work_mode: q.get('work_mode') ?? '',
    });
    if (q.get('contract_type') || q.get('experience') || q.get('work_mode')) {
      this.showFilters.set(true);
    }

    // Recherche réactive (mise à jour locale + remise page 1)
    this.filterForm.valueChanges.pipe(debounceTime(200)).subscribe(() => {
      this.formValue.set(this.filterForm.getRawValue());
      this.page.set(1);
    });

    this.load();
  }

  private load(): void {
    this.loading.set(true);
    // On laisse aussi le serveur filtrer (utile pour de gros volumes).
    const serverFilters: JobFilters = {};
    this.jobService.list(serverFilters).subscribe({
      next: (jobs) => { this.jobs.set(jobs); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  go(p: number): void {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  reset(): void {
    this.filterForm.reset({ search: '', location: '', contract_type: '', experience: '', work_mode: '' });
    this.router.navigate([], { queryParams: {} });
  }
}
