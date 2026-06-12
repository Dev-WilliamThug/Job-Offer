import { Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CompanyService } from '../../core/services/company.service';
import { NotificationService } from '../../core/services/notification.service';
import { SpinnerComponent } from '../../shared/spinner.component';
import { Company, CompanyListItem, CompanyWrite } from '../../core/models/models';
import { COMPANY_SIZE_OPTIONS, COMPANY_STATUS_BADGE, COMPANY_STATUS_LABELS } from '../../core/models/labels';

/**
 * « Mon entreprise » : création ou modification de la fiche entreprise
 * du recruteur. Une entreprise doit être validée (statut « active ») par
 * un administrateur avant que des offres puissent y être publiées.
 */
@Component({
  selector: 'app-company-setup',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, SpinnerComponent],
  template: `
    <div class="page">
      <div class="container" style="max-width:820px">
        <div class="page-head"><h1>Mon entreprise</h1><p class="sub">{{ company() ? 'Gérez la fiche de votre entreprise.' : 'Créez la fiche de votre entreprise pour publier des offres.' }}</p></div>

        @if (loading()) {
          <app-spinner message="Chargement…" />
        } @else {
          @if (company()) {
            <div class="card card-pad mb-3 flex items-center justify-between flex-wrap gap-2">
              <div class="flex items-center gap-2">
                <span class="avatar avatar-lg" style="background:var(--blue-600);color:#fff">{{ company()!.name.charAt(0) }}</span>
                <div>
                  <h2 class="mb-0">{{ company()!.name }}</h2>
                  <span class="badge" [class]="statusBadge()">{{ statusLabel() }}</span>
                </div>
              </div>
              @if (company()!.status === 'pending') {
                <div class="alert alert-warn" style="margin:0;max-width:340px">⏳ En attente de validation par un administrateur. Vous pourrez publier des offres une fois activée.</div>
              } @else if (company()!.status === 'active') {
                <a routerLink="/recruteur/offres/nouvelle" class="btn btn-accent">+ Publier une offre</a>
              }
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="card card-pad mb-3">
              <h3>Informations générales</h3>
              <div class="form-group">
                <label class="form-label">Nom de l'entreprise <span class="req">*</span></label>
                <input formControlName="name" class="form-control" [class.is-invalid]="invalid('name')" placeholder="Ex : TechCorp">
                @if (invalid('name')) { <p class="field-error">Le nom est obligatoire.</p> }
              </div>
              <div class="form-group">
                <label class="form-label">Description</label>
                <textarea formControlName="description" class="form-control" rows="4" placeholder="Présentez votre entreprise, son activité, ses valeurs…"></textarea>
              </div>
              <div class="grid grid-2">
                <div class="form-group mb-0">
                  <label class="form-label">Secteur d'activité</label>
                  <input formControlName="sector" class="form-control" placeholder="Tech, Finance, Santé…">
                </div>
                <div class="form-group mb-0">
                  <label class="form-label">Taille</label>
                  <select formControlName="size" class="form-control">
                    <option value="">Non précisée</option>
                    @for (o of sizes; track o.value) { <option [value]="o.value">{{ o.label }}</option> }
                  </select>
                </div>
              </div>
            </div>

            <div class="card card-pad mb-3">
              <h3>Coordonnées</h3>
              <div class="grid grid-2">
                <div class="form-group">
                  <label class="form-label">Email de contact</label>
                  <input formControlName="email" type="email" class="form-control" [class.is-invalid]="invalid('email')" placeholder="contact@entreprise.com">
                  @if (invalid('email')) { <p class="field-error">Email invalide.</p> }
                </div>
                <div class="form-group">
                  <label class="form-label">Téléphone</label>
                  <input formControlName="phone" class="form-control" placeholder="+221 ...">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Site web</label>
                <input formControlName="website" class="form-control" [class.is-invalid]="invalid('website')" placeholder="https://...">
                @if (invalid('website')) { <p class="field-error">URL invalide (commencez par http).</p> }
              </div>
              <div class="grid grid-3">
                <div class="form-group mb-0">
                  <label class="form-label">Adresse</label>
                  <input formControlName="address" class="form-control">
                </div>
                <div class="form-group mb-0">
                  <label class="form-label">Ville</label>
                  <input formControlName="city" class="form-control">
                </div>
                <div class="form-group mb-0">
                  <label class="form-label">Pays</label>
                  <input formControlName="country" class="form-control">
                </div>
              </div>
            </div>

            <div class="flex gap-2 justify-end">
              <button type="submit" class="btn btn-primary" [disabled]="submitting()">
                @if (submitting()) { <span class="spinner"></span> Enregistrement… }
                @else { {{ company() ? 'Enregistrer les modifications' : 'Créer mon entreprise' }} }
              </button>
            </div>
          </form>
        }
      </div>
    </div>
  `,
})
export class CompanySetupComponent implements OnInit {
  private fb = inject(FormBuilder);
  private companyService = inject(CompanyService);
  private notify = inject(NotificationService);

  sizes = COMPANY_SIZE_OPTIONS;
  loading = signal(true);
  submitting = signal(false);
  company = signal<Company | null>(null);
  private slug: string | null = null;

  private urlPattern = /^https?:\/\/.+/;

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    description: [''],
    sector: [''],
    size: [''],
    email: ['', [Validators.email]],
    phone: [''],
    website: ['', [Validators.pattern(this.urlPattern)]],
    address: [''],
    city: [''],
    country: [''],
  });

  statusLabel = () => this.company() ? COMPANY_STATUS_LABELS[this.company()!.status] : '';
  statusBadge = () => this.company() ? COMPANY_STATUS_BADGE[this.company()!.status] : '';

  invalid(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  ngOnInit(): void {
    this.companyService.mine().subscribe({
      next: (companies: CompanyListItem[]) => {
        if (companies.length) {
          this.slug = companies[0].slug;
          this.loadDetail(this.slug);
        } else {
          this.loading.set(false);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  private loadDetail(slug: string): void {
    this.companyService.detail(slug).subscribe({
      next: (c) => {
        this.company.set(c);
        this.form.patchValue({
          name: c.name, description: c.description, sector: c.sector, size: c.size,
          email: c.email, phone: c.phone, website: c.website,
          address: c.address, city: c.city, country: c.country,
        });
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true);
    const data = this.form.getRawValue() as CompanyWrite;

    const done = (msg: string) => {
      this.notify.success(msg);
      this.submitting.set(false);
    };

    if (this.slug) {
      this.companyService.update(this.slug, data).subscribe({
        next: (c) => { this.company.set(c); this.slug = c.slug; done('Entreprise mise à jour.'); },
        error: () => this.submitting.set(false),
      });
    } else {
      this.companyService.create(data).subscribe({
        next: (res) => {
          this.company.set(res.company);
          this.slug = res.company.slug;
          done('Entreprise créée. Elle sera visible après validation par un administrateur.');
        },
        error: () => this.submitting.set(false),
      });
    }
  }
}
