package com.trakio.core.exercise;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ExerciseRepository extends JpaRepository<Exercise, UUID> {

    Optional<Exercise> findBySlug(String slug);

    List<Exercise> findBySlugIn(Collection<String> slugs);

    boolean existsBySlug(String slug);

    @Query("""
            select e from Exercise e
            where (:q = '' or lower(e.name) like concat('%', :q, '%'))
              and (:group is null or e.group = :group)
              and (:demo is null or e.demoStatus = :demo)
            """)
    Page<Exercise> searchMatching(String q, MuscleGroup group, DemoStatus demo, Pageable pageable);

    /** {@code q} null or blank = no text filter. Wildcards typed by the user are matched literally. */
    default Page<Exercise> search(String q, MuscleGroup group, DemoStatus demo, Pageable pageable) {
        return searchMatching(com.trakio.core.common.Like.term(q), group, demo, pageable);
    }

    long countByDemoStatus(DemoStatus status);

    @Query("select count(distinct pe.day.plan.id) from PlanExercise pe where pe.exercise.id = :exerciseId")
    long countPlansUsing(UUID exerciseId);
}
