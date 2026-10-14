package com.foliolive.core.repository;

import com.foliolive.core.model.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlertRepository extends JpaRepository<Alert, String> {
    List<Alert> findByPortfolioIdOrderByCreatedAtDesc(String portfolioId);
    List<Alert> findByPortfolioIdAndAcknowledgedOrderByCreatedAtDesc(String portfolioId, boolean acknowledged);
}
