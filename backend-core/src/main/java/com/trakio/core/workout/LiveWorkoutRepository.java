package com.trakio.core.workout;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LiveWorkoutRepository extends JpaRepository<LiveWorkout, UUID> {}
