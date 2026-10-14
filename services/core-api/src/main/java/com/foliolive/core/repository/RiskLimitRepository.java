package com.foliolive.core.repository;

import com.foliolive.core.model.RiskLimit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RiskLimitRepository extends JpaRepository<RiskLimit, String> {
    List<RiskLimit> findByPortfolioId(String portfolioId);
}
