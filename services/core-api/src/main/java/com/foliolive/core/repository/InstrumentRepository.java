package com.foliolive.core.repository;

import com.foliolive.core.model.Instrument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InstrumentRepository extends JpaRepository<Instrument, String> {
    List<Instrument> findByAssetClass(Instrument.AssetClass assetClass);
    List<Instrument> findBySector(Instrument.Sector sector);
    List<Instrument> findByAssetClassAndSector(Instrument.AssetClass assetClass, Instrument.Sector sector);
}
