-- Trakio backend-core — initial schema.
-- Conventions: UUID keys (not guessable), timestamptz in UTC, money in cents, optimistic locking via "version".

-- ── Accounts ────────────────────────────────────────────────────────────────

create table users (
    id             uuid primary key,
    email          varchar(254) not null unique,
    password_hash  varchar(255) not null,
    role           varchar(16)  not null check (role in ('CLIENT', 'TRAINER', 'ADMIN')),
    status         varchar(16)  not null check (status in ('ACTIVE', 'SUSPENDED')),
    -- Bumped on password change, suspension and "sign out everywhere": older access tokens stop working.
    token_version  integer      not null default 0,
    last_seen_at   timestamptz,
    created_at     timestamptz  not null,
    updated_at     timestamptz  not null,
    version        bigint       not null
);

create table refresh_tokens (
    id           uuid primary key,
    user_id      uuid        not null references users (id) on delete cascade,
    -- Every rotation stays in the same family; reusing a rotated token revokes the whole family.
    family_id    uuid        not null,
    token_hash   varchar(64) not null unique,
    expires_at   timestamptz not null,
    created_at   timestamptz not null,
    revoked_at   timestamptz,
    replaced_at  timestamptz
);
create index refresh_tokens_user_idx on refresh_tokens (user_id);
create index refresh_tokens_family_idx on refresh_tokens (family_id);

create table user_preferences (
    user_id            uuid primary key references users (id) on delete cascade,
    vibration          boolean not null default true,
    lock_screen_alert  boolean not null default true,
    rest_sound         boolean not null default true
);

-- ── Files ───────────────────────────────────────────────────────────────────

create table stored_files (
    id            uuid primary key,
    owner_id      uuid         not null references users (id) on delete cascade,
    purpose       varchar(16)  not null check (purpose in ('AVATAR', 'CHAT', 'VERIFICATION', 'MEAL')),
    content_type  varchar(64)  not null,
    size_bytes    bigint       not null,
    original_name varchar(255),
    storage_key   varchar(64)  not null unique,
    sha256        varchar(64)  not null,
    created_at    timestamptz  not null
);
create index stored_files_owner_idx on stored_files (owner_id);

-- ── Profiles ────────────────────────────────────────────────────────────────

create table exercises (
    id            uuid primary key,
    slug          varchar(64)  not null unique,
    name          varchar(120) not null,
    muscle_group  varchar(16)  not null check (muscle_group in ('CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'ARMS', 'CORE')),
    muscles       varchar(200) not null default '',
    equipment     varchar(120) not null default '',
    demo_status   varchar(16)  not null default 'TODO' check (demo_status in ('READY', 'PRODUCTION', 'TODO')),
    created_at    timestamptz  not null,
    updated_at    timestamptz  not null,
    version       bigint       not null
);

create table workout_plans (
    id                 uuid primary key,
    -- null owner = Trakio template, visible to everyone.
    owner_id           uuid         references users (id) on delete cascade,
    -- Set when the plan is a student's own copy, edited by their PT.
    client_id          uuid         references users (id) on delete cascade,
    name               varchar(120) not null,
    weeks              integer      not null check (weeks between 1 and 52),
    workouts_per_week  integer      not null check (workouts_per_week between 1 and 7),
    created_at         timestamptz  not null,
    updated_at         timestamptz  not null,
    version            bigint       not null
);
create index workout_plans_owner_idx on workout_plans (owner_id);

create table plan_days (
    id        uuid primary key,
    plan_id   uuid        not null references workout_plans (id) on delete cascade,
    position  integer     not null,
    label     varchar(80) not null,
    focus     varchar(80) not null default ''
);
create index plan_days_plan_idx on plan_days (plan_id);

create table plan_exercises (
    id             uuid primary key,
    day_id         uuid             not null references plan_days (id) on delete cascade,
    position       integer          not null,
    exercise_id    uuid             not null references exercises (id),
    sets           integer          not null check (sets between 1 and 20),
    reps_min       integer          not null check (reps_min between 1 and 100),
    reps_max       integer          not null check (reps_max between 1 and 100),
    rest_seconds   integer          not null check (rest_seconds between 0 and 900),
    reference_kg   double precision,
    note           varchar(500)     not null default ''
);
create index plan_exercises_day_idx on plan_exercises (day_id);

create table client_profiles (
    id              uuid primary key,
    user_id         uuid             not null unique references users (id) on delete cascade,
    name            varchar(80)      not null,
    photo_file_id   uuid             references stored_files (id) on delete set null,
    sex             varchar(8)       not null check (sex in ('MALE', 'FEMALE')),
    birth_year      integer          not null,
    height_cm       double precision not null,
    weight_kg       double precision not null,
    goal_weight_kg  double precision,
    goal            varchar(16)      not null check (goal in ('LOSE', 'MAINTAIN', 'GAIN')),
    activity        varchar(16)      not null check (activity in ('SEDENTARY', 'LIGHT', 'MODERATE', 'HIGH', 'ATHLETE')),
    days_per_week   integer          not null check (days_per_week between 1 and 7),
    experience      varchar(16)      not null check (experience in ('NEW', 'SOME', 'ADVANCED')),
    coached         boolean          not null default false,
    plan_id         uuid             references workout_plans (id) on delete set null,
    created_at      timestamptz      not null,
    updated_at      timestamptz      not null,
    version         bigint           not null
);

create table trainer_profiles (
    id                  uuid primary key,
    user_id             uuid         not null unique references users (id) on delete cascade,
    name                varchar(80)  not null,
    photo_file_id       uuid         references stored_files (id) on delete set null,
    article             varchar(1)   not null default 'o' check (article in ('a', 'o')),
    city                varchar(60)  not null,
    area                varchar(80)  not null default '',
    online              boolean      not null default false,
    bio                 varchar(1000) not null default '',
    verified            boolean      not null default false,
    stripe_account_id   varchar(64)  unique,
    payouts_enabled     boolean      not null default false,
    created_at          timestamptz  not null,
    updated_at          timestamptz  not null,
    version             bigint       not null
);
create index trainer_profiles_city_idx on trainer_profiles (city);

create table trainer_specialties (
    trainer_profile_id  uuid        not null references trainer_profiles (id) on delete cascade,
    specialty           varchar(40) not null,
    primary key (trainer_profile_id, specialty)
);

create table trainer_packages (
    id            uuid primary key,
    trainer_id    uuid         not null references users (id) on delete cascade,
    name          varchar(80)  not null,
    description   varchar(300) not null default '',
    price_cents   integer      not null check (price_cents between 100 and 100000),
    period        varchar(8)   not null check (period in ('MONTH', 'ONCE')),
    active        boolean      not null default true,
    position      integer      not null default 0,
    created_at    timestamptz  not null,
    updated_at    timestamptz  not null,
    version       bigint       not null
);
create index trainer_packages_trainer_idx on trainer_packages (trainer_id);

-- ── Coaching & chat ─────────────────────────────────────────────────────────

create table coaching_relationships (
    id            uuid primary key,
    client_id     uuid         not null references users (id) on delete cascade,
    trainer_id    uuid         not null references users (id) on delete cascade,
    package_id    uuid         references trainer_packages (id) on delete set null,
    package_name  varchar(80)  not null,
    price_cents   integer      not null,
    period        varchar(8)   not null check (period in ('MONTH', 'ONCE')),
    status        varchar(16)  not null check (status in ('PENDING_PAYMENT', 'ACTIVE', 'ENDED', 'CANCELLED')),
    started_at    timestamptz,
    ended_at      timestamptz,
    created_at    timestamptz  not null,
    updated_at    timestamptz  not null,
    version       bigint       not null
);
create index coaching_trainer_idx on coaching_relationships (trainer_id, status);
-- A student has at most one PT at a time.
create unique index coaching_one_open_per_client on coaching_relationships (client_id)
    where status in ('PENDING_PAYMENT', 'ACTIVE');

create table conversations (
    id                     uuid primary key,
    trainer_id             uuid        not null references users (id) on delete cascade,
    client_id              uuid        not null references users (id) on delete cascade,
    trainer_last_read_id   bigint      not null default 0,
    client_last_read_id    bigint      not null default 0,
    last_message_at        timestamptz,
    created_at             timestamptz not null,
    updated_at             timestamptz not null,
    version                bigint      not null,
    unique (trainer_id, client_id)
);
create index conversations_client_idx on conversations (client_id);

create table messages (
    id               bigint generated always as identity primary key,
    conversation_id  uuid          not null references conversations (id) on delete cascade,
    sender_id        uuid          references users (id) on delete set null,
    kind             varchar(16)   not null check (kind in ('TEXT', 'PHOTO', 'FILE', 'WORKOUT')),
    body             varchar(2000),
    file_id          uuid          references stored_files (id) on delete set null,
    title            varchar(160),
    detail           varchar(300),
    created_at       timestamptz   not null
);
create index messages_conversation_idx on messages (conversation_id, id);

-- ── Training ────────────────────────────────────────────────────────────────

create table workout_sessions (
    id           uuid primary key,
    user_id      uuid             not null references users (id) on delete cascade,
    -- Id the phone made up, so a retried upload is not saved twice.
    client_ref   varchar(64)      not null,
    plan_id      uuid             references workout_plans (id) on delete set null,
    plan_day_id  uuid             references plan_days (id) on delete set null,
    title        varchar(120)     not null,
    focus        varchar(80)      not null default '',
    started_at   timestamptz      not null,
    finished_at  timestamptz      not null,
    volume_kg    double precision not null,
    set_count    integer          not null,
    feeling      varchar(8)       check (feeling in ('EASY', 'GOOD', 'HARD', 'MAX')),
    created_at   timestamptz      not null,
    unique (user_id, client_ref)
);
create index workout_sessions_user_idx on workout_sessions (user_id, finished_at desc);

create table session_exercises (
    id           uuid primary key,
    session_id   uuid         not null references workout_sessions (id) on delete cascade,
    position     integer      not null,
    exercise_id  uuid         not null references exercises (id),
    name         varchar(120) not null,
    record       boolean      not null default false
);
create index session_exercises_session_idx on session_exercises (session_id);

create table session_sets (
    session_exercise_id  uuid             not null references session_exercises (id) on delete cascade,
    position             integer          not null,
    kg                   double precision not null,
    reps                 integer          not null,
    primary key (session_exercise_id, position)
);

create table live_workouts (
    user_id     uuid        primary key references users (id) on delete cascade,
    state       text        not null,
    updated_at  timestamptz not null
);

create table weight_entries (
    id           uuid primary key,
    user_id      uuid             not null references users (id) on delete cascade,
    measured_on  date             not null,
    kg           double precision not null,
    created_at   timestamptz      not null,
    unique (user_id, measured_on)
);

-- ── Nutrition ───────────────────────────────────────────────────────────────

create table foods (
    id                varchar(40) primary key,
    name              varchar(80)      not null,
    kcal_per_100      double precision not null,
    protein_per_100   double precision not null,
    carbs_per_100     double precision not null,
    fat_per_100       double precision not null,
    unit_grams        double precision not null,
    portion_grams     double precision not null
);

create table food_aliases (
    food_id  varchar(40) not null references foods (id) on delete cascade,
    alias    varchar(60) not null,
    primary key (food_id, alias)
);

create table meals (
    id             uuid primary key,
    user_id        uuid        not null references users (id) on delete cascade,
    day            date        not null,
    slot           varchar(16) not null check (slot in ('BREAKFAST', 'LUNCH', 'SNACK', 'DINNER')),
    eaten_at       time        not null,
    source         varchar(8)  not null check (source in ('MANUAL', 'AI')),
    photo_file_id  uuid        references stored_files (id) on delete set null,
    created_at     timestamptz not null
);
create index meals_user_day_idx on meals (user_id, day);

create table meal_items (
    meal_id         uuid             not null references meals (id) on delete cascade,
    position        integer          not null,
    food_id         varchar(40)      references foods (id) on delete set null,
    name            varchar(80)      not null,
    grams           double precision not null,
    kcal_per_g      double precision not null,
    protein_per_g   double precision not null,
    carbs_per_g     double precision not null,
    fat_per_g       double precision not null,
    primary key (meal_id, position)
);

-- ── Marketplace: reviews, reports, verification ─────────────────────────────

create table reviews (
    id          uuid primary key,
    trainer_id  uuid          not null references users (id) on delete cascade,
    author_id   uuid          not null references users (id) on delete cascade,
    rating      smallint      not null check (rating between 1 and 5),
    comment     varchar(1000) not null default '',
    removed_at  timestamptz,
    created_at  timestamptz   not null,
    unique (trainer_id, author_id)
);

create table reports (
    id           uuid primary key,
    reporter_id  uuid          references users (id) on delete set null,
    kind         varchar(8)    not null check (kind in ('REVIEW', 'PROFILE')),
    review_id    uuid          references reviews (id) on delete set null,
    trainer_id   uuid          references users (id) on delete cascade,
    reason       varchar(1000) not null,
    status       varchar(8)    not null check (status in ('OPEN', 'RESOLVED')),
    resolution   varchar(24)   check (resolution in ('REMOVE_REVIEW', 'ASK_PROFILE_FIX', 'KEEP')),
    resolved_by  uuid          references users (id) on delete set null,
    resolved_at  timestamptz,
    created_at   timestamptz   not null,
    updated_at   timestamptz   not null,
    version      bigint        not null
);
create index reports_status_idx on reports (status, created_at);

create table verification_requests (
    id            uuid primary key,
    trainer_id    uuid          not null unique references users (id) on delete cascade,
    status        varchar(16)   not null check (status in ('DRAFT', 'SUBMITTED', 'INFO_REQUESTED', 'APPROVED', 'REFUSED')),
    admin_note    varchar(1000) not null default '',
    submitted_at  timestamptz,
    decided_at    timestamptz,
    decided_by    uuid          references users (id) on delete set null,
    created_at    timestamptz   not null,
    updated_at    timestamptz   not null,
    version       bigint        not null
);

create table verification_documents (
    id           uuid primary key,
    request_id   uuid        not null references verification_requests (id) on delete cascade,
    type         varchar(24) not null check (type in ('IDENTITY', 'PROFESSIONAL_TITLE', 'INSURANCE')),
    file_id      uuid        not null references stored_files (id) on delete cascade,
    status       varchar(16) not null check (status in ('SUBMITTED', 'CONFIRMED', 'REJECTED')),
    valid_until  date,
    uploaded_at  timestamptz not null,
    unique (request_id, type)
);

-- ── Billing ─────────────────────────────────────────────────────────────────

create table subscriptions (
    id                         uuid primary key,
    user_id                    uuid        not null references users (id) on delete cascade,
    kind                       varchar(16) not null check (kind in ('PREMIUM', 'MARKETPLACE')),
    status                     varchar(16) not null check (status in ('INCOMPLETE', 'ACTIVE', 'PAST_DUE', 'CANCELED')),
    provider_subscription_id   varchar(64) unique,
    provider_customer_id       varchar(64),
    current_period_end         timestamptz,
    cancel_at_period_end       boolean     not null default false,
    created_at                 timestamptz not null,
    updated_at                 timestamptz not null,
    version                    bigint      not null,
    unique (user_id, kind)
);

create table payments (
    id               uuid primary key,
    payer_id         uuid          references users (id) on delete set null,
    trainer_id       uuid          references users (id) on delete set null,
    relationship_id  uuid          references coaching_relationships (id) on delete set null,
    kind             varchar(16)   not null check (kind in ('COACHING', 'PREMIUM', 'MARKETPLACE')),
    description      varchar(160)  not null,
    amount_cents     bigint        not null check (amount_cents >= 0),
    fee_cents        bigint        not null default 0 check (fee_cents >= 0),
    currency         varchar(3)    not null default 'EUR',
    status           varchar(24)   not null check (status in
                         ('PENDING', 'PAID', 'FAILED', 'REFUND_REQUESTED', 'REFUNDED', 'REFUND_DECLINED', 'RESCHEDULED', 'DISPUTED')),
    -- Checkout session id while pending; payment intent / invoice id once paid.
    provider_ref     varchar(128)  unique,
    refund_reason    varchar(1000),
    paid_at          timestamptz,
    created_at       timestamptz   not null,
    updated_at       timestamptz   not null,
    version          bigint        not null
);
create index payments_trainer_idx on payments (trainer_id, paid_at);
create index payments_payer_idx on payments (payer_id, created_at);
create index payments_status_idx on payments (status, created_at);

create table processed_webhook_events (
    event_id     varchar(255) primary key,
    received_at  timestamptz  not null
);

-- ── Admin ───────────────────────────────────────────────────────────────────

create table audit_log (
    id           bigint generated always as identity primary key,
    actor_id     uuid         references users (id) on delete set null,
    action       varchar(64)  not null,
    target_type  varchar(32)  not null,
    target_id    varchar(64)  not null,
    detail       varchar(1000) not null default '',
    created_at   timestamptz  not null
);
create index audit_log_target_idx on audit_log (target_type, target_id);
