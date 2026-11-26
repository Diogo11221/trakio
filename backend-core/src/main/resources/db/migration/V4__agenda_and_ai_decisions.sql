-- PT agenda (sessions with a student or alone) and what PTs did with AI suggestions.

create table appointments (
    id               uuid primary key,
    trainer_id       uuid         not null references users (id) on delete cascade,
    client_id        uuid         references users (id) on delete cascade,
    starts_at        timestamptz  not null,
    duration_minutes integer      not null check (duration_minutes between 5 and 480),
    title            varchar(120) not null,
    place            varchar(120) not null default '',
    online           boolean      not null default false,
    created_at       timestamptz  not null,
    updated_at       timestamptz  not null,
    version          bigint       not null
);
create index appointments_trainer_idx on appointments (trainer_id, starts_at);
create index appointments_client_idx on appointments (client_id, starts_at);

create table ai_decisions (
    id          uuid primary key,
    trainer_id  uuid        not null references users (id) on delete cascade,
    client_id   uuid        not null references users (id) on delete cascade,
    kind        varchar(16) not null check (kind in ('LIGHT_WEEK', 'HOME_WORKOUT', 'VARIATION')),
    decision    varchar(8)  not null check (decision in ('APPLIED', 'IGNORED')),
    created_at  timestamptz not null
);
create index ai_decisions_lookup_idx on ai_decisions (trainer_id, client_id, kind, created_at desc);
