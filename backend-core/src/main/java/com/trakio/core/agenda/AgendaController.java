package com.trakio.core.agenda;

import com.trakio.core.account.ClientProfile;
import com.trakio.core.account.ClientProfileRepository;
import com.trakio.core.account.TrainerProfile;
import com.trakio.core.account.TrainerProfileRepository;
import com.trakio.core.auth.AuthUser;
import com.trakio.core.coaching.CoachingService;
import com.trakio.core.common.ApiException;
import com.trakio.core.files.FileService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
class AgendaController {

    record Person(UUID id, String name, String photoUrl) {}

    record AppointmentView(UUID id, Instant startsAt, int durationMinutes, String title, String place, boolean online,
            Person with) {}

    record AppointmentInput(
            UUID clientId,
            @NotNull Instant startsAt,
            @Min(5) @Max(480) int durationMinutes,
            @NotBlank @Size(max = 120) String title,
            @Size(max = 120) String place,
            boolean online) {}

    private final AppointmentRepository appointments;
    private final CoachingService coaching;
    private final ClientProfileRepository clients;
    private final TrainerProfileRepository trainers;
    private final Clock clock;

    AgendaController(AppointmentRepository appointments, CoachingService coaching, ClientProfileRepository clients,
            TrainerProfileRepository trainers, Clock clock) {
        this.appointments = appointments;
        this.coaching = coaching;
        this.clients = clients;
        this.trainers = trainers;
        this.clock = clock;
    }

    /** The PT's agenda; by default from the start of today for a week. */
    @GetMapping("/api/v1/trainer/agenda")
    @Transactional(readOnly = true)
    List<AppointmentView> agenda(@AuthenticationPrincipal AuthUser me, @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to) {
        Instant start = from == null ? clock.instant().truncatedTo(ChronoUnit.DAYS) : from;
        Instant end = to == null ? start.plus(7, ChronoUnit.DAYS) : to;
        if (Duration.between(start, end).toDays() > 92 || end.isBefore(start)) {
            throw ApiException.badRequest("invalid-range", "Escolhe um período até 3 meses.");
        }
        List<Appointment> list = appointments.findByTrainerIdAndStartsAtBetweenOrderByStartsAt(me.id(), start, end);
        Map<UUID, ClientProfile> people = clients.findByUserIdIn(list.stream().map(Appointment::getClientId)
                .filter(id -> id != null).toList()).stream().collect(Collectors.toMap(ClientProfile::getUserId, Function.identity()));
        return list.stream().map(a -> view(a, a.getClientId() == null ? null : people.get(a.getClientId()) == null ? null
                : new Person(a.getClientId(), people.get(a.getClientId()).getName(),
                        FileService.url(people.get(a.getClientId()).getPhotoFileId())))).toList();
    }

    @PostMapping("/api/v1/trainer/agenda")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    AppointmentView create(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody AppointmentInput in) {
        Instant now = clock.instant();
        if (in.startsAt().isBefore(now.minus(1, ChronoUnit.DAYS)) || in.startsAt().isAfter(now.plus(366, ChronoUnit.DAYS))) {
            throw ApiException.badRequest("invalid-time", "Escolhe uma data no próximo ano.");
        }
        Person with = null;
        if (in.clientId() != null) {
            coaching.requireActiveStudent(me.id(), in.clientId());
            with = clients.findByUserId(in.clientId())
                    .map(c -> new Person(c.getUserId(), c.getName(), FileService.url(c.getPhotoFileId()))).orElse(null);
        }
        Appointment saved = appointments.save(new Appointment(me.id(), in.clientId(), in.startsAt(), in.durationMinutes(),
                in.title().trim(), in.place() == null ? "" : in.place().trim(), in.online()));
        return view(saved, with);
    }

    @DeleteMapping("/api/v1/trainer/agenda/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    void delete(@AuthenticationPrincipal AuthUser me, @PathVariable UUID id) {
        appointments.delete(appointments.findByIdAndTrainerId(id, me.id()).orElseThrow(() -> ApiException.notFound("Esta sessão")));
    }

    /** A student's upcoming sessions with their PT. */
    @GetMapping("/api/v1/me/agenda")
    @PreAuthorize("hasRole('CLIENT')")
    @Transactional(readOnly = true)
    List<AppointmentView> mine(@AuthenticationPrincipal AuthUser me) {
        List<Appointment> list = appointments.findByClientIdAndStartsAtAfterOrderByStartsAt(me.id(),
                clock.instant().minus(2, ChronoUnit.HOURS));
        Map<UUID, TrainerProfile> pts = trainers.findByUserIdIn(list.stream().map(Appointment::getTrainerId).toList()).stream()
                .collect(Collectors.toMap(TrainerProfile::getUserId, Function.identity()));
        return list.stream().map(a -> {
            TrainerProfile t = pts.get(a.getTrainerId());
            return view(a, t == null ? null : new Person(t.getUserId(), t.getName(), FileService.url(t.getPhotoFileId())));
        }).toList();
    }

    private static AppointmentView view(Appointment a, Person with) {
        return new AppointmentView(a.getId(), a.getStartsAt(), a.getDurationMinutes(), a.getTitle(), a.getPlace(), a.isOnline(), with);
    }
}
