package com.trakio.core.agenda;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppointmentRepository extends JpaRepository<Appointment, UUID> {

    List<Appointment> findByTrainerIdAndStartsAtBetweenOrderByStartsAt(UUID trainerId, Instant from, Instant to);

    List<Appointment> findByClientIdAndStartsAtAfterOrderByStartsAt(UUID clientId, Instant after);

    Optional<Appointment> findByIdAndTrainerId(UUID id, UUID trainerId);
}
