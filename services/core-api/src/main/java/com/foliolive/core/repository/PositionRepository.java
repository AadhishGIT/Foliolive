package com.foliolive.core.repository;

import com.foliolive.core.model.Instrument;
import com.foliolive.core.model.Position;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PositionRepository extends JpaRepository<Position, String> {
    List<Position> findByPortfolioId(String portfolioId);
    Page<Position> findByPortfolioId(String portfolioId, Pageable pageable);
    Page<Position> findByPortfolioIdAndInstrument_Sector(String portfolioId, Instrument.Sector sector, Pageable pageable);
    Page<Position> findByPortfolioIdAndInstrument_AssetClass(String portfolioId, Instrument.AssetClass assetClass, Pageable pageable);
    Page<Position> findByPortfolioIdAndInstrument_SymbolContainingIgnoreCase(String portfolioId, String symbol, Pageable pageable);
    Optional<Position> findByPortfolioIdAndInstrument_Symbol(String portfolioId, String symbol);
}
