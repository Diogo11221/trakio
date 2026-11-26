package com.trakio.core.auth;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface UserRepository extends JpaRepository<User, UUID> {

    interface TokenState {
        UserStatus getStatus();

        int getTokenVersion();
    }

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByRole(Role role);

    @Query("select u.status as status, u.tokenVersion as tokenVersion from User u where u.id = :id")
    Optional<TokenState> findTokenState(UUID id);

    long countByRole(Role role);

    @Query(value = """
            select u from User u
            left join ClientProfile c on c.userId = u.id
            left join TrainerProfile t on t.userId = u.id
            where (:role is null or u.role = :role)
              and (:status is null or u.status = :status)
              and (:q = '' or lower(u.email) like concat('%', :q, '%')
                   or lower(c.name) like concat('%', :q, '%') or lower(t.name) like concat('%', :q, '%'))
            order by u.createdAt desc
            """, countQuery = """
            select count(u) from User u
            left join ClientProfile c on c.userId = u.id
            left join TrainerProfile t on t.userId = u.id
            where (:role is null or u.role = :role)
              and (:status is null or u.status = :status)
              and (:q = '' or lower(u.email) like concat('%', :q, '%')
                   or lower(c.name) like concat('%', :q, '%') or lower(t.name) like concat('%', :q, '%'))
            """)
    org.springframework.data.domain.Page<User> adminSearchMatching(String q, Role role, UserStatus status,
            org.springframework.data.domain.Pageable pageable);

    /** {@code q} null or blank = everyone. */
    default org.springframework.data.domain.Page<User> adminSearch(String q, Role role, UserStatus status,
            org.springframework.data.domain.Pageable pageable) {
        return adminSearchMatching(com.trakio.core.common.Like.term(q), role, status, pageable);
    }

    long countByLastSeenAtAfter(Instant since);

    long countByRoleAndCreatedAtAfter(Role role, Instant since);
}
