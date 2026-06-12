import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { JobService } from '../../core/services/job.service';
import { CompanyService } from '../../core/services/company.service';
import { NotificationService } from '../../core/services/notification.service';
import { SpinnerComponent } from '../../shared/spinner.component';
import { CompanyListItem, JobWrite } from '../../core/models/models';
import { CONTRACT_OPTIONS, EXPERIENCE_OPTIONS, WORKMODE_OPTIONS } from '../../core/models/labels';

/**
 * Formulaire de création / modification d'une offre (Reactive Form).
 * Validation côté client : champs requis, salaire min ≤ max, date limite future.
 * Le même composant gère les deux modes selon la présence d'un :slug en route.
 */
@Component({
  selector: 'app-job-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, SpinnerComponent],
  template: `
    <div class="page">
      <div class="container" style="max-width:840px">
        <a routerLink="/recruteur/offres" class="back-link">‹ Retour à mes offres</a>
        <div class="page-head mt-2">
          <h1>{{ isEdit() ? 'Modifier l\\'offre' : 'Créer une offre' }}</h1>
          <p class="sub">Renseignez les détails du poste. Les champs marqués <span class="text-accent">*</span> sont obligatoires.</p>
        </div>

        @if (loading()) {
          <app-spinner message="Chargement…" />
        } @else if (companies().length === 0) {
          <div class="empty-state card">
            <div class="icon">🏢</div>
            <h3>Aucune entreprise active</h3>
            <p>Vous devez disposer d'une entreprise validée avant de publier une offre.</p>
            <a routerLink="/recruteur/entreprise" class="btn btn-primary mt-2">Configurer mon entreprise</a>
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <!-- Détails du poste -->
            <div class="card card-pad mb-3">
              <h3>Détails du poste</h3>
              <div class="form-group">
                <label class="form-label">Intitulé du poste <span class="req">*</span></label>
                <input formControlName="title" class="form-control" [class.is-invalid]="invalid('title')" placeholder="Ex : Développeur Full-Stack">
                @if (invalid('title')) { <p class="field-error">L'intitulé est obligatoire.</p> }
              </div>

              <div class="form-group">
                <label class="form-label">Entreprise <span class="req">*</span></label>
                <select formControlName="company" class="form-control" [class.is-invalid]="invalid('company')">
                  <option [ngValue]="null" disabled>Sélectionnez…</option>
                  @for (c of companies(); track c.id) { <option [ngValue]="c.id">{{ c.name }}</option> }
                </select>
                @if (invalid('company')) { <p class="field-error">Sélectionnez une entreprise.</p> }
              </div>

              <div class="form-group">
                <label class="form-label">Description <span class="req">*</span></label>
                <textarea formControlName="description" class="form-control" rows="5" [class.is-invalid]="invalid('description')" placeholder="Décrivez les missions, le contexte, l'équipe…"></textarea>
                @if (invalid('description')) { <p class="field-error">Une description est requise (min. 20 caractères).</p> }
              </div>
              <div class="form-group">
                <label class="form-label">Profil recherché / Prérequis</label>
                <textarea formControlName="requirements" class="form-control" rows="3" placeholder="Compétences, diplômes, expérience attendue…"></textarea>
              </div>
              <div class="form-group mb-0">
                <label class="form-label">Avantages</label>
                <textarea formControlName="benefits" class="form-control" rows="2" placeholder="Télétravail, mutuelle, primes…"></textarea>
              </div>
            </div>

            <!-- Caractéristiques -->
            <div class="card card-pad mb-3">
              <h3>Caractéristiques</h3>
              <div class="grid grid-3">
                <div class="form-group">
                  <label class="form-label">Type de contrat <span class="req">*</span></label>
                  <select formControlName="contract_type" class="form-control">
                    @for (o of contracts; track o.value) { <option [value]="o.value">{{ o.label }}</option> }
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Expérience</label>
                  <select formControlName="experience_level" class="form-control">
                    @for (o of experiences; track o.value) { <option [value]="o.value">{{ o.label }}</option> }
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Mode de travail</label>
                  <select formControlName="work_mode" class="form-control">
                    @for (o of workmodes; track o.value) { <option [value]="o.value">{{ o.label }}</option> }
                  </select>
                </div>
              </div>
              <div class="form-group mb-0">
                <label class="form-label">Lieu de travail</label>
                <input formControlName="location" class="form-control" placeholder="Ex : Dakar, Sénégal">
              </div>
            </div>

            <!-- Rémunération & échéance -->
            <div class="card card-pad mb-3">
              <h3>Rémunération & échéance</h3>
              <div class="grid grid-2">
                <div class="form-group">
                  <label class="form-label">Salaire minimum</label>
                  <input type="number" formControlName="salary_min" class="form-control" [class.is-invalid]="salaryError()" min="0" placeholder="Ex : 500000">
                </div>
                <div class="form-group">
                  <label class="form-label">Salaire maximum</label>
                  <input type="number" formControlName="salary_max" class="form-control" [class.is-invalid]="salaryError()" min="0" placeholder="Ex : 900000">
                </div>
              </div>
              @if (salaryError()) { <p class="field-error" style="margin-top:-8px">Le salaire minimum ne peut pas dépasser le maximum.</p> }

              <label class="check-row mb-2">
                <input type="checkbox" formControlName="salary_is_public">
                <span>Afficher le salaire publiquement</span>
              </label>

              <div class="form-group mb-0">
                <label class="form-label">Date limite de candidature <span class="req">*</span></label>
                <input type="datetime-local" formControlName="deadline" class="form-control" [class.is-invalid]="invalid('deadline') || deadlinePast()" [min]="minDeadline">
                @if (invalid('deadline')) { <p class="field-error">La date limite est obligatoire.</p> }
                @else if (deadlinePast()) { <p class="field-error">La date limite doit être dans le futur.</p> }
              </div>
            </div>

            <!-- Publication -->
            <div class="card card-pad mb-3">
              <h3>Publication</h3>
              <div class="status-choices">
                <label class="status-choice" [class.active]="form.controls.status.value === 'draft'">
                  <input type="radio" formControlName="status" value="draft">
                  <div><strong>📝 Brouillon</strong><span class="text-xs text-muted">Visible par vous seul, non publiée.</span></div>
                </label>
                <label class="status-choice" [class.active]="form.controls.status.value === 'published'">
                  <input type="radio" formControlName="status" value="published">
                  <div><strong>📢 Publier</strong><span class="text-xs text-muted">Visible par tous les candidats.</span></div>
                </label>
              </div>
            </div>

            <div class="flex gap-2 justify-end">
              <a routerLink="/recruteur/offres" class="btn btn-ghost">Annuler</a>
              <button type="submit" class="btn btn-primary" [disabled]="submitting()">
                @if (submitting()) { <span class="spinner"></span> Enregistrement… }
                @else { {{ isEdit() ? 'Enregistrer' : 'Créer l\\'offre' }} }
              </button>
            </div>
          </form>
        }
      </div>
    </div>
  `,
  styles: [`
    .back-link { font-weight: 600; color: var(--gray-500); }
    .back-link:hover { color: var(--blue-700); }
    .check-row { display: flex; align-items: center; gap: 10px; font-weight: 500; color: var(--gray-700); cursor: pointer; }
    .check-row input { width: 18px; height: 18px; accent-color: var(--blue-600); }
    .status-choices { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .status-choice { display: flex; align-items: center; gap: 12px; padding: 16px; border: 2px solid var(--gray-200); border-radius: var(--radius); cursor: pointer; transition: .15s; }
    .status-choice:hover { border-color: var(--blue-300); }
    .status-choice.active { border-color: var(--blue-600); background: var(--blue-50); }
    .status-choice input { width: 18px; height: 18px; accent-color: var(--blue-600); }
    .status-choice strong { display: block; color: var(--gray-900); }
    @media (max-width: 640px) { .status-choices { grid-template-columns: 1fr; } }
  `],
})
export class JobFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private jobService = inject(JobService);
  private companyService = inject(CompanyService);
  private notify = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  contracts = CONTRACT_OPTIONS;
  experiences = EXPERIENCE_OPTIONS;
  workmodes = WORKMODE_OPTIONS;

  loading = signal(true);
  submitting = signal(false);
  companies = signal<CompanyListItem[]>([]);
  slug = signal<string | null>(null);
  isEdit = computed(() => this.slug() !== null);

  /** Borne minimale du datetime-local : maintenant. */
  minDeadline = this.toLocalInput(new Date(Date.now() + 60_000));

  form = this.fb.nonNullable.group({
    title: ['', [Validators.required]],
    company: [null as number | null, [Validators.required]],
    description: ['', [Validators.required, Validators.minLength(20)]],
    requirements: [''],
    benefits: [''],
    contract_type: ['cdi'],
    experience_level: ['no_require'],
    work_mode: ['onsite'],
    location: [''],
    salary_min: [null as number | null],
    salary_max: [null as number | null],
    salary_is_public: [true],
    deadline: ['', [Validators.required]],
    status: ['draft'],
  }, { validators: [salaryRangeValidator] });

  invalid(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  salaryError(): boolean {
    const c = this.form.controls.salary_min;
    return !!this.form.errors?.['salaryRange'] && (c.touched || c.dirty || this.form.controls.salary_max.dirty);
  }

  deadlinePast(): boolean {
    const v = this.form.controls.deadline.value;
    if (!v) return false;
    return new Date(v).getTime() <= Date.now();
  }

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    this.slug.set(slug);

    if (slug) {
      // Mode édition : on récupère l'offre via /mine/ (inclut brouillons) + entreprises
      forkJoin({ companies: this.companyService.mine(), jobs: this.jobService.mine() }).subscribe({
        next: ({ companies, jobs }) => {
          this.companies.set(companies);
          const job = jobs.find((j) => j.slug === slug);
          if (job) {
            this.form.patchValue({
              title: job.title,
              company: job.company,
              description: job.description,
              requirements: job.requirements,
              benefits: job.benefits,
              contract_type: job.contract_type,
              experience_level: job.experience_level,
              work_mode: job.work_mode,
              location: job.location,
              salary_min: job.salary_min ? Number(job.salary_min) : null,
              salary_max: job.salary_max ? Number(job.salary_max) : null,
              salary_is_public: job.salary_is_public,
              deadline: this.toLocalInput(new Date(job.deadline)),
              status: job.status === 'closed' ? 'closed' : job.status,
            });
          } else {
            this.notify.error('Offre introuvable.');
            this.router.navigate(['/recruteur/offres']);
          }
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    } else {
      this.companyService.mine().subscribe({
        next: (companies) => {
          this.companies.set(companies);
          if (companies.length === 1) this.form.controls.company.setValue(companies[0].id);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    }
  }

  submit(): void {
    if (this.form.invalid || this.deadlinePast()) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true);
    const v = this.form.getRawValue();

    const payload: JobWrite = {
      title: v.title,
      company: v.company!,
      description: v.description,
      requirements: v.requirements,
      benefits: v.benefits,
      contract_type: v.contract_type as JobWrite['contract_type'],
      experience_level: v.experience_level as JobWrite['experience_level'],
      work_mode: v.work_mode as JobWrite['work_mode'],
      location: v.location,
      salary_min: v.salary_min,
      salary_max: v.salary_max,
      salary_is_public: v.salary_is_public,
      deadline: new Date(v.deadline).toISOString(),
      status: v.status as JobWrite['status'],
    };

    const slug = this.slug();
    const obs: Observable<unknown> = slug
      ? this.jobService.update(slug, payload)
      : this.jobService.create(payload);
    obs.subscribe({
      next: () => {
        this.notify.success(slug ? 'Offre mise à jour.' : 'Offre créée avec succès.');
        this.submitting.set(false);
        this.router.navigate(['/recruteur/offres']);
      },
      error: () => this.submitting.set(false),
    });
  }

  /** Date → "YYYY-MM-DDTHH:mm" pour <input type="datetime-local">. */
  private toLocalInput(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}

/** Validateur croisé : salary_min ≤ salary_max. */
function salaryRangeValidator(group: AbstractControl): ValidationErrors | null {
  const min = group.get('salary_min')?.value;
  const max = group.get('salary_max')?.value;
  if (min != null && max != null && Number(min) > Number(max)) {
    return { salaryRange: true };
  }
  return null;
}
