import { Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { ProfileService } from '../../core/services/profile.service';
import { NotificationService } from '../../core/services/notification.service';
import { SpinnerComponent } from '../../shared/spinner.component';
import { mediaUrl } from '../../core/services/media.util';

/**
 * « Modifier profil » candidat (Reactive Form, validation côté client).
 * Met à jour à la fois le nom (endpoint /me/) et le profil candidat
 * (endpoint /profile/candidate/ en multipart pour le CV).
 */
@Component({
  selector: 'app-candidate-profile-edit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, SpinnerComponent],
  template: `
    <div class="page">
      <div class="container" style="max-width:760px">
        <a routerLink="/candidat/profil" class="back-link">‹ Retour au profil</a>
        <div class="page-head mt-2"><h1>Modifier mon profil</h1><p class="sub">Mettez à jour vos informations et votre CV.</p></div>

        @if (loading()) {
          <app-spinner message="Chargement…" />
        } @else {
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <!-- Identité -->
            <div class="card card-pad mb-3">
              <h3>Informations personnelles</h3>
              <div class="grid grid-2">
                <div class="form-group">
                  <label class="form-label">Prénom <span class="req">*</span></label>
                  <input formControlName="first_name" class="form-control" [class.is-invalid]="invalid('first_name')">
                  @if (invalid('first_name')) { <p class="field-error">Le prénom est obligatoire.</p> }
                </div>
                <div class="form-group">
                  <label class="form-label">Nom <span class="req">*</span></label>
                  <input formControlName="last_name" class="form-control" [class.is-invalid]="invalid('last_name')">
                  @if (invalid('last_name')) { <p class="field-error">Le nom est obligatoire.</p> }
                </div>
              </div>
              <div class="grid grid-2">
                <div class="form-group">
                  <label class="form-label">Téléphone</label>
                  <input formControlName="phone" class="form-control" placeholder="+221 ...">
                </div>
                <div class="form-group">
                  <label class="form-label">Localisation</label>
                  <input formControlName="location" class="form-control" placeholder="Dakar, Sénégal">
                </div>
              </div>
              <div class="form-group mb-0">
                <label class="form-label">Présentation (bio)</label>
                <textarea formControlName="bio" class="form-control" rows="4" placeholder="Présentez votre parcours en quelques lignes…"></textarea>
              </div>
            </div>

            <!-- Compétences & CV -->
            <div class="card card-pad mb-3">
              <h3>Compétences & CV</h3>
              <div class="form-group">
                <label class="form-label">Compétences</label>
                <input formControlName="skills" class="form-control" placeholder="Python, Angular, Communication…">
                <p class="field-hint">Séparez vos compétences par des virgules.</p>
              </div>
              <div class="form-group mb-0">
                <label class="form-label">CV (PDF / Word)</label>
                @if (currentCv()) {
                  <p class="field-hint mb-1">CV actuel : <a [href]="currentCv()!" target="_blank" rel="noopener">ouvrir</a></p>
                }
                <input type="file" class="form-control" accept=".pdf,.doc,.docx" (change)="onFile($event)">
                <p class="field-hint">Laissez vide pour conserver le CV actuel.</p>
              </div>
            </div>

            <!-- Liens -->
            <div class="card card-pad mb-3">
              <h3>Liens professionnels</h3>
              <div class="grid grid-2">
                <div class="form-group mb-0">
                  <label class="form-label">LinkedIn</label>
                  <input formControlName="linkedin_url" class="form-control" [class.is-invalid]="invalid('linkedin_url')" placeholder="https://linkedin.com/in/...">
                  @if (invalid('linkedin_url')) { <p class="field-error">URL invalide.</p> }
                </div>
                <div class="form-group mb-0">
                  <label class="form-label">Portfolio / Site web</label>
                  <input formControlName="portfolio_url" class="form-control" [class.is-invalid]="invalid('portfolio_url')" placeholder="https://...">
                  @if (invalid('portfolio_url')) { <p class="field-error">URL invalide.</p> }
                </div>
              </div>
            </div>

            <div class="flex gap-2 justify-end">
              <a routerLink="/candidat/profil" class="btn btn-ghost">Annuler</a>
              <button type="submit" class="btn btn-primary" [disabled]="submitting()">
                @if (submitting()) { <span class="spinner"></span> Enregistrement… }
                @else { Enregistrer les modifications }
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
  `],
})
export class CandidateProfileEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private profileService = inject(ProfileService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  loading = signal(true);
  submitting = signal(false);
  currentCv = signal<string | null>(null);
  private file: File | null = null;

  private urlPattern = /^https?:\/\/.+/;

  form = this.fb.nonNullable.group({
    first_name: ['', [Validators.required]],
    last_name: ['', [Validators.required]],
    phone: [''],
    location: [''],
    bio: [''],
    skills: [''],
    linkedin_url: ['', [Validators.pattern(this.urlPattern)]],
    portfolio_url: ['', [Validators.pattern(this.urlPattern)]],
  });

  invalid(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  ngOnInit(): void {
    this.profileService.getMe().subscribe({
      next: (u) => {
        const p = u.candidate_profile;
        this.form.patchValue({
          first_name: u.first_name,
          last_name: u.last_name,
          phone: p?.phone ?? '',
          location: p?.location ?? '',
          bio: p?.bio ?? '',
          skills: p?.skills ?? '',
          linkedin_url: p?.linkedin_url ?? '',
          portfolio_url: p?.portfolio_url ?? '',
        });
        this.currentCv.set(mediaUrl(p?.resume));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.file = input.files?.[0] ?? null;
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true);
    const v = this.form.getRawValue();

    // Profil candidat en multipart (pour le CV éventuel)
    const fd = new FormData();
    fd.append('phone', v.phone);
    fd.append('location', v.location);
    fd.append('bio', v.bio);
    fd.append('skills', v.skills);
    fd.append('linkedin_url', v.linkedin_url);
    fd.append('portfolio_url', v.portfolio_url);
    if (this.file) fd.append('resume', this.file);

    // 1) nom (endpoint /me/) puis 2) profil candidat
    this.profileService.updateMe({ first_name: v.first_name, last_name: v.last_name }).pipe(
      switchMap(() => this.profileService.updateCandidateProfile(fd)),
    ).subscribe({
      next: () => {
        this.notify.success('Profil mis à jour avec succès.');
        this.submitting.set(false);
        this.router.navigate(['/candidat/profil']);
      },
      error: () => this.submitting.set(false),
    });
  }
}
