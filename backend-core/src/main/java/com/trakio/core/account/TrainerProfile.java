package com.trakio.core.account;

import com.trakio.core.common.BaseEntity;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "trainer_profiles")
public class TrainerProfile extends BaseEntity {

    @Column(nullable = false, unique = true)
    private UUID userId;

    @Column(nullable = false, length = 80)
    private String name;

    private UUID photoFileId;

    /** "a Rita" / "o Tiago" — authored with the profile, never guessed from the name. */
    @Column(nullable = false, length = 1)
    private String article = "o";

    @Column(nullable = false, length = 60)
    private String city;

    @Column(nullable = false, length = 80)
    private String area = "";

    @Column(nullable = false)
    private boolean online;

    @Column(nullable = false, length = 1000)
    private String bio = "";

    /** Set by an admin when the verification is approved — never by the trainer. */
    @Column(nullable = false)
    private boolean verified;

    @Column(unique = true, length = 64)
    private String stripeAccountId;

    @Column(nullable = false)
    private boolean payoutsEnabled;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "trainer_specialties", joinColumns = @JoinColumn(name = "trainer_profile_id"))
    @Column(name = "specialty", length = 40)
    private Set<String> specialties = new LinkedHashSet<>();

    protected TrainerProfile() {}

    public TrainerProfile(UUID userId) {
        this.userId = userId;
    }

    public void update(AccountDtos.TrainerProfileInput in) {
        this.name = in.name().trim();
        this.photoFileId = in.photoFileId();
        this.article = in.article() == null ? "o" : in.article();
        this.city = in.city().trim();
        this.area = in.area() == null ? "" : in.area().trim();
        this.online = in.online();
        this.bio = in.bio() == null ? "" : in.bio().trim();
        this.specialties.clear();
        this.specialties.addAll(in.specialties());
    }

    public UUID getUserId() {
        return userId;
    }

    public String getName() {
        return name;
    }

    public UUID getPhotoFileId() {
        return photoFileId;
    }

    public String getArticle() {
        return article;
    }

    public String getCity() {
        return city;
    }

    public String getArea() {
        return area;
    }

    public boolean isOnline() {
        return online;
    }

    public String getBio() {
        return bio;
    }

    public boolean isVerified() {
        return verified;
    }

    public void setVerified(boolean verified) {
        this.verified = verified;
    }

    public String getStripeAccountId() {
        return stripeAccountId;
    }

    public void setStripeAccountId(String stripeAccountId) {
        this.stripeAccountId = stripeAccountId;
    }

    public boolean isPayoutsEnabled() {
        return payoutsEnabled;
    }

    public void setPayoutsEnabled(boolean payoutsEnabled) {
        this.payoutsEnabled = payoutsEnabled;
    }

    public Set<String> getSpecialties() {
        return specialties;
    }

    /** "Lisboa · Alvalade", "Lisboa + Online", "Online". */
    public String where() {
        String place = area.isBlank() ? city : city + " · " + area;
        if ("Online".equalsIgnoreCase(city)) {
            return "Online";
        }
        return online && area.isBlank() ? place + " + Online" : place;
    }
}
