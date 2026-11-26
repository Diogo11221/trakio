package com.trakio.core.account;

import com.trakio.core.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Year;
import java.util.UUID;

@Entity
@Table(name = "client_profiles")
public class ClientProfile extends BaseEntity {

    @Column(nullable = false, unique = true)
    private UUID userId;

    @Column(nullable = false, length = 80)
    private String name;

    private UUID photoFileId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 8)
    private Sex sex;

    @Column(nullable = false)
    private int birthYear;

    @Column(nullable = false)
    private double heightCm;

    @Column(nullable = false)
    private double weightKg;

    private Double goalWeightKg;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Goal goal;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private ActivityLevel activity;

    @Column(nullable = false)
    private int daysPerWeek;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Experience experience;

    @Column(nullable = false)
    private boolean coached;

    /** The plan this person follows: a Trakio template, or the copy their PT made for them. */
    private UUID planId;

    protected ClientProfile() {}

    public ClientProfile(UUID userId) {
        this.userId = userId;
    }

    public void update(AccountDtos.ClientProfileInput in) {
        this.name = in.name().trim();
        this.photoFileId = in.photoFileId();
        this.sex = in.sex();
        this.birthYear = in.birthYear();
        this.heightCm = in.heightCm();
        this.weightKg = in.weightKg();
        // Only asked when the goal is to lose fat or gain muscle.
        this.goalWeightKg = in.goal() == Goal.MAINTAIN ? null : in.goalWeightKg();
        this.goal = in.goal();
        this.activity = in.activity();
        this.daysPerWeek = in.daysPerWeek();
        this.experience = in.experience();
        this.coached = in.coached();
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

    public Sex getSex() {
        return sex;
    }

    public int getBirthYear() {
        return birthYear;
    }

    public int age() {
        return Year.now().getValue() - birthYear;
    }

    public double getHeightCm() {
        return heightCm;
    }

    public double getWeightKg() {
        return weightKg;
    }

    public void setWeightKg(double weightKg) {
        this.weightKg = weightKg;
    }

    public Double getGoalWeightKg() {
        return goalWeightKg;
    }

    public Goal getGoal() {
        return goal;
    }

    public ActivityLevel getActivity() {
        return activity;
    }

    public int getDaysPerWeek() {
        return daysPerWeek;
    }

    public Experience getExperience() {
        return experience;
    }

    public boolean isCoached() {
        return coached;
    }

    public void setCoached(boolean coached) {
        this.coached = coached;
    }

    public UUID getPlanId() {
        return planId;
    }

    public void setPlanId(UUID planId) {
        this.planId = planId;
    }
}
