import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { JobService } from '../../core/services/job.service';
import { ApplicationService } from '../../core/services/application.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { SpinnerComponent } from '../../shared/spinner.component';
import { JobDetail } from '../../core/models/models';
import { CONTRACT_LABELS, EXPERIENCE_LABELS, WORKMODE_LABELS } from '../../core/models/labels';
import { mediaUrl, initials } from '../../core/services/media.util';

/**
 * Détail d'une offre : description, prérequis, avantages, salaire,
 * localisation, entreprise, et le bouton/formulaire « Postuler ».
 */
@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DatePipe, SpinnerComponent],
  template: `
    <div class="page">
      <div class="container">
        @if (loading()) {
          <app-spinner message="Chargement de l'offre…" />
        } @else if (!job()) {
          <div class="empty-state card">
            <div class="icon">🚫</div>
            <h3>Offre introuvable</h3>
            <p>Cette offre n'existe plus ou n'est pas publiée.</p>
            <a routerLink="/offres" class="btn btn-primary mt-2">Retour aux offres</a>
          </div>
        } @else {
          <a routerLink="/offres" class="back-link">‹ Retour aux offres</a>

          <div class="detail-grid mt-2">
            <!-- Colonne principale -->
            <div class="fade-in">
              <div class="card card-pad">
                <div class="detail-head">
                  <span class="avatar avatar-lg">
                    @if (logo()) { <img [src]="logo()!" [alt]="job()!.company_name" style="width:100%;height:100%;border-radius:inherit;object-fit:cover"> }
                    @else { {{ ini() }} }
                  </span>
                  <div>
                    <h1 class="mb-1">{{ job()!.title }}</h1>
                    <p class="company-line mb-2">
                      <strong>{{ job()!.company_name }}</strong>
                      @if (job()!.company_city) { · {{ job()!.company_city }} }
                    </p>
                    <div class="flex gap-1 flex-wrap">
                      <span class="chip">{{ contract() }}</span>
                      <span class="chip">{{ workmode() }}</span>
                      <span class="chip">{{ experience() }}</span>
                      @if (job()!.is_expired) { <span class="badge badge-red">Expirée</span> }
                    </div>
                  </div>
                </div>

                <hr class="divider">

                <section class="prose">
                  <h3>Description du poste</h3>
                  <p class="pre-line">{{ job()!.description }}</p>

                  @if (job()!.requirements) {
                    <h3 class="mt-3">Profil recherché</h3>
                    <p class="pre-line">{{ job()!.requirements }}</p>
                  }
                  @if (job()!.benefits) {
                    <h3 class="mt-3">Avantages</h3>
                    <p class="pre-line">{{ job()!.benefits }}</p>
                  }
                </section>
              </div>

              <!-- Formulaire de candidature -->
              @if (showApply()) {
                <div class="card card-pad mt-3 fade-in" id="apply">
                  <h3>Postuler à cette offre</h3>
                  <p class="text-muted text-sm">Rédigez une lettre de motivation et joignez votre CV (optionnel).</p>
                  <form [formGroup]="applyForm" (ngSubmit)="apply()" novalidate>
                    <div class="form-group">
                      <label class="form-label" for="cl">Lettre de motivation <span class="req">*</span></label>
                      <textarea id="cl" formControlName="cover_letter" class="form-control" rows="6"
                        [class.is-invalid]="invalid('cover_letter')"
                        placeholder="Expliquez en quelques lignes pourquoi vous êtes le profil idéal…"></textarea>
                      @if (invalid('cover_letter')) { <p class="field-error">Une lettre de motivation est requise (min. 20 caractères).</p> }
                    </div>
                    <div class="form-group">
                      <label class="form-label" for="cv">CV (PDF, optionnel)</label>
                      <input id="cv" type="file" class="form-control" accept=".pdf,.doc,.docx" (change)="onFile($event)">
                      <p class="field-hint">Si vous ne joignez rien, le CV de votre profil sera utilisé.</p>
                    </div>
                    <div class="flex gap-2">
                      <button type="submit" class="btn btn-accent" [disabled]="submitting()">
                        @if (submitting()) { <span class="spinner"></span> Envoi… }
                        @else { Envoyer ma candidature }
                      </button>
                      <button type="button" class="btn btn-ghost" (click)="showApply.set(false)">Annuler</button>
                    </div>
                  </form>
                </div>
              }
            </div>

            <!-- Colonne latérale -->
            <aside class="fade-in">
              <div class="card card-pad sticky">
                <div class="salary-box">
                  <span class="text-xs text-muted">Rémunération</span>
                  <strong class="salary-amount">
                    @if (job()!.salary_display) { {{ job()!.salary_display }} }
                    @else { Non communiqué }
                  </strong>
                </div>

                <ul class="facts">
                  <li><span>📍 Lieu</span><strong>{{ job()!.location || job()!.company_city || '—' }}</strong></li>
                  <li><span>📄 Contrat</span><strong>{{ contract() }}</strong></li>
                  <li><span>💼 Mode</span><strong>{{ workmode() }}</strong></li>
                  <li><span>⭐ Expérience</span><strong>{{ experience() }}</strong></li>
                  <li><span>⏰ Date limite</span><strong>{{ job()!.deadline | date:'dd MMM yyyy' }}</strong></li>
                  <li><span>👥 Candidatures</span><strong>{{ job()!.application_count }}</strong></li>
                </ul>

                <!-- CTA Postuler selon le contexte -->
                @if (alreadyApplied()) {
                  <div class="alert alert-success mt-2">✓ Vous avez déjà postulé à cette offre.</div>
                  <a routerLink="/candidat/candidatures" class="btn btn-outline btn-block mt-2">Voir mes candidatures</a>
                } @else if (!job()!.is_open) {
                  <div class="alert alert-warn mt-2">Cette offre est clôturée ou expirée.</div>
                } @else if (!auth.isLoggedIn()) {
                  <a routerLink="/connexion" [queryParams]="{ returnUrl: '/offres/' + job()!.slug }" class="btn btn-accent btn-block btn-lg mt-2">Se connecter pour postuler</a>
                } @else if (auth.isCandidate()) {
                  <button class="btn btn-accent btn-block btn-lg mt-2" (click)="openApply()">Postuler maintenant</button>
                } @else {
                  <div class="alert alert-info mt-2">Seuls les candidats peuvent postuler.</div>
                }

                <a [routerLink]="['/offres']" class="btn btn-ghost btn-block mt-2">Voir d'autres offres</a>
              </div>
            </aside>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .back-link { font-weight: 600; color: var(--gray-500); }
    .back-link:hover { color: var(--blue-700); }
    .detail-grid { display: grid; grid-template-columns: 1fr 360px; gap: 24px; align-items: start; }
    .detail-head { display: flex; gap: 18px; align-items: flex-start; }
    .company-line { color: var(--gray-600); }
    .prose h3 { font-size: 1.15rem; }
    .pre-line { white-space: pre-line; color: var(--gray-700); }
    .sticky { position: sticky; top: 86px; }
    .salary-box { display: flex; flex-direction: column; gap: 3px; padding: 16px; background: var(--blue-50); border-radius: var(--radius); margin-bottom: 18px; }
    .salary-amount { font-size: 1.5rem; color: var(--blue-800); }
    .facts { list-style: none; display: flex; flex-direction: column; gap: 12px; }
    .facts li { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: .9rem; }
    .facts li span { color: var(--text-muted); }
    .facts li strong { color: var(--gray-800); text-align: right; }
    @media (max-width: 900px) { .detail-grid { grid-template-columns: 1fr; } .sticky { position: static; } }
  `],
})
export class JobDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private jobService = inject(JobService);
  private appService = inject(ApplicationService);
  private fb = inject(FormBuilder);
  private notify = inject(NotificationService);
  auth = inject(AuthService);

  loading = signal(true);
  submitting = signal(false);
  showApply = signal(false);
  alreadyApplied = signal(false);
  job = signal<JobDetail | null>(null);
  private file: File | null = null;

  applyForm = this.fb.nonNullable.group({
    cover_letter: ['', [Validators.required, Validators.minLength(20)]],
  });

  logo = () => mediaUrl(this.job()?.company_logo);
  ini = () => initials(this.job()?.company_name);
  contract = () => { const j = this.job(); return j ? CONTRACT_LABELS[j.contract_type] : ''; };
  experience = () => { const j = this.job(); return j ? EXPERIENCE_LABELS[j.experience_level] : ''; };
  workmode = () => { const j = this.job(); return j ? WORKMODE_LABELS[j.work_mode] : ''; };

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug')!;
    this.jobService.detail(slug).subscribe({
      next: (job) => {
        this.job.set(job);
        this.loading.set(false);
        this.checkApplied(job.id);
      },
      error: () => { this.job.set(null); this.loading.set(false); },
    });
  }

  /** Détecte si le candidat connecté a déjà postulé. */
  private checkApplied(jobId: number): void {
    if (!this.auth.isCandidate()) return;
    this.appService.mine().subscribe({
      next: (apps) => this.alreadyApplied.set(apps.some((a) => a.job_offer === jobId)),
      error: () => {},
    });
  }

  invalid(name: 'cover_letter'): boolean {
    const c = this.applyForm.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  openApply(): void {
    this.showApply.set(true);
    setTimeout(() => document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth' }), 50);
  }

  onFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.file = input.files?.[0] ?? null;
  }

  apply(): void {
    const job = this.job();
    if (!job || this.applyForm.invalid) { this.applyForm.markAllAsTouched(); return; }
    this.submitting.set(true);

    const fd = new FormData();
    fd.append('job_offer', String(job.id));
    fd.append('cover_letter', this.applyForm.controls.cover_letter.value);
    if (this.file) fd.append('resume', this.file);

    this.appService.apply(fd).subscribe({
      next: () => {
        this.notify.success('Votre candidature a été envoyée avec succès !');
        this.submitting.set(false);
        this.showApply.set(false);
        this.alreadyApplied.set(true);
        this.router.navigate(['/candidat/candidatures']);
      },
      error: () => this.submitting.set(false),
    });
  }
}
