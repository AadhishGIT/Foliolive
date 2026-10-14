package com.foliolive.core.repository;

import com.foliolive.core.model.Trade;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TradeRepository extends JpaRepository<Trade, String> {
    List<Trade> findByPortfolioIdOrderByExecutedAtDesc(String portfolioId);
    Page<Trade> findByPortfolioIdOrderByExecutedAtDesc(String portfolioId, Pageable pageable);
}
