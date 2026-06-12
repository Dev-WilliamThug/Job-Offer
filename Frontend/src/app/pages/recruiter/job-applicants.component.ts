import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { JobService } from '../../core/services/job.service';
import { ApplicationService } from '../../core/services/application.service';
import { NotificationService } from '../../core/services/notification.service';
import { SpinnerComponent } from '../../shared/spinner.component';
import { JobDetail, RecruiterApplication, ApplicationStatus } from '../../core/models/models';
import { APP_STATUS_BADGE, APP_STATUS_LABELS } from '../../core/models/labels';
import { mediaUrl, initials } from '../../core/services/media.util';

/**
 * « Voir les candidats » + gestion des candidatures d'une offre :
 * consultation du dossier (CV, compétences, lettre) et changement de
 * statut (en examen / acceptée / refusée) avec note interne.
 */
@Component({
  selector: 'app-job-applicants',
  standalone: true,
  imports: [RouterLink, DatePipe, SpinnerComponent],
  template: `
    <div class="page">
      <div class="container">
        <a routerLink="/recruteur/offres" class="back-link">‹ Retour à mes offres</a>

        @if (loading()) {
          <app-spinner message="Chargement des candidatures…" />
        } @else if (!job()) {
          <div class="empty-state card mt-2"><div class="icon">🚫</div><h3>Offre introuvable</h3></div>
        } @else {
          <div class="page-head mt-2">
            <h1>Candidatures — {{ job()!.title }}</h1>
            <p class="sub">{{ apps().length }} candidature{{ apps().length > 1 ? 's' : '' }} reçue{{ apps().length > 1 ? 's' : '' }}.</p>
          </div>

          <!-- Filtres -->
          <div class="tabs mb-3">
            @for (t of tabs; track t.value) {
              <button class="tab" [class.active]="filter() === t.value" (click)="filter.set(t.value)">{{ t.label }}<span class="tab-count">{{ countFor(t.value) }}</span></button>
            }
          </div>

          @if (visible().length === 0) {
            <div class="empty-state card">
              <div class="icon">👥</div>
              <h3>Aucune candidature {{ filter() ? 'dans cette catégorie' : '' }}</h3>
              <p>Les candidatures reçues apparaîtront ici.</p>
            </div>
          } @else {
            <div class="app-grid">
              @for (a of visible(); track a.id) {
                <div class="card card-pad applicant fade-in">
                  <div class="applicant-head">
                    <span class="avatar">{{ ini(a.candidate_name) }}</span>
                    <div class="flex-1">
                      <strong class="applicant-name">{{ a.candidate_name || a.candidate_email }}</strong>
                      <p class="text-xs text-muted mb-0">{{ a.candidate_email }} · {{ a.applied_at | date:'dd MMM yyyy' }}</p>
                    </div>
                    <span class="badge" [class]="badge(a.status)">{{ label(a.status) }}</span>
                  </div>

                  @if (a.candidate_skills) {
                    <div class="flex gap-1 flex-wrap mt-2">
                      @for (s of skills(a.candidate_skills); track s) { <span class="chip chip-skill">{{ s }}</span> }
                    </div>
                  }

                  @if (a.cover_letter) {
                    <p class="cover-letter mt-2">{{ a.cover_letter }}</p>
                  }

                  <div class="flex gap-2 flex-wrap mt-2">
                    @if (resumeUrl(a)) {
                      <a [href]="resumeUrl(a)!" target="_blank" rel="noopener" class="btn btn-outline btn-sm">📄 CV</a>
                    }
                    @if (a.candidate_linkedin) {
                      <a [href]="a.candidate_linkedin" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">🔗 LinkedIn</a>
                    }
                  </div>

                  <hr class="divider" style="margin:16px 0">

                  <!-- Gestion du statut -->
                  @if (a.status === 'withdrawn') {
                    <p class="text-muted text-sm mb-0">Candidature retirée par le candidat.</p>
                  } @else {
                    <div class="manage">
                      @if (a.status !== 'reviewing' && a.status !== 'accepted' && a.status !== 'rejected') {
                        <button class="btn btn-outline btn-sm" (click)="setStatus(a, 'reviewing')" [disabled]="busy() === a.id">Examiner</button>
                      }
                      <button class="btn btn-success btn-sm" (click)="setStatus(a, 'accepted')" [disabled]="busy() === a.id || a.status === 'accepted'">✓ Accepter</button>
                      <button class="btn btn-danger btn-sm" (click)="setStatus(a, 'rejected')" [disabled]="busy() === a.id || a.status === 'rejected'">✕ Refuser</button>
                      @if (busy() === a.id) { <span class="spinner spinner-blue"></span> }
                    </div>
                  }
                </div>
              }
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .back-link { font-weight: 600; color: var(--gray-500); }
    .back-link:hover { color: var(--blue-700); }
    .tabs { display: flex; gap: 8px; flex-wrap: wrap; }
    .tab { display: inline-flex; align-items: center; gap: 8px; padding: 8px 15px; border-radius: 999px; border: 1.5px solid var(--gray-200); background: #fff; font-weight: 600; font-size: .86rem; color: var(--gray-600); cursor: pointer; font-family: inherit; }
    .tab.active { background: var(--blue-600); border-color: var(--blue-600); color: #fff; }
    .tab-count { background: rgba(0,0,0,.08); padding: 1px 8px; border-radius: 999px; font-size: .76rem; }
    .tab.active .tab-count { background: rgba(255,255,255,.25); }
    .app-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
    .applicant-head { display: flex; align-items: center; gap: 14px; }
    .applicant-name { color: var(--gray-900); font-size: 1.02rem; }
    .cover-letter { background: var(--gray-50); border-radius: var(--radius); padding: 12px 14px; color: var(--gray-700); font-size: .9rem; white-space: pre-line; max-height: 140px; overflow: auto; }
    .manage { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    @media (max-width: 860px) { .app-grid { grid-template-columns: 1fr; } }
  `],
})
export class JobApplicantsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private jobService = inject(JobService);
  private appService = inject(ApplicationService);
  private notify = inject(NotificationService);

  loading = signal(true);
  busy = signal<number | null>(null);
  job = signal<JobDetail | null>(null);
  apps = signal<RecruiterApplication[]>([]);
  filter = signal<ApplicationStatus | ''>('');

  tabs: { value: ApplicationStatus | ''; label: string }[] = [
    { value: '', label: 'Toutes' },
    { value: 'pending', label: 'En attente' },
    { value: 'reviewing', label: 'En examen' },
    { value: 'accepted', label: 'Acceptées' },
    { value: 'rejected', label: 'Refusées' },
  ];

  visible = computed(() => {
    const f = this.filter();
    return f ? this.apps().filter((a) => a.status === f) : this.apps();
  });

  label = (s: ApplicationStatus) => APP_STATUS_LABELS[s];
  badge = (s: ApplicationStatus) => APP_STATUS_BADGE[s];
  countFor = (s: ApplicationStatus | '') => s ? this.apps().filter((a) => a.status === s).length : this.apps().length;
  ini = (name: string) => initials(name);
  skills = (raw: string) => raw.split(',').map((s) => s.trim()).filter(Boolean);
  resumeUrl = (a: RecruiterApplication) => mediaUrl(a.resume ?? a.candidate_resume);

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug')!;
    // On retrouve l'offre (et son id) parmi les offres du recruteur.
    this.jobService.mine().subscribe({
      next: (jobs) => {
        const job = jobs.find((j) => j.slug === slug) ?? null;
        this.job.set(job);
        if (job) {
          this.appService.forJob(job.id).subscribe({
            next: (apps) => { this.apps.set(apps); this.loading.set(false); },
            error: () => this.loading.set(false),
          });
        } else {
          this.loading.set(false);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  setStatus(a: RecruiterApplication, status: ApplicationStatus): void {
    this.busy.set(a.id);
    this.appService.updateStatus(a.id, status).subscribe({
      next: () => {
        const msg = status === 'accepted' ? 'Candidature acceptée.' : status === 'rejected' ? 'Candidature refusée.' : 'Candidature en cours d\'examen.';
        this.notify.success(msg);
        this.apps.update((list) => list.map((x) => x.id === a.id ? { ...x, status } : x));
        this.busy.set(null);
      },
      error: () => this.busy.set(null),
    });
  }
}
