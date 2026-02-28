import React, { useState } from 'react';
import { Card, CardContent, CardHeader, Box, Button, Tabs, Tab } from '@mui/material';
import { Download } from 'lucide-react';
import PageHeader from '../components/PageHeader';

const UserManualPage = () => {
  const [language, setLanguage] = useState('en');

  const handleDownloadPDF = () => {
    // Open the manual in a new window for printing
    window.open('/admin-reports-manual.html', '_blank');
  };

  const manualContentEN = `
    <div class="manual-content">
      <h1>Admin Reports User Manual</h1>
      
      <section>
        <h2>Access</h2>
        <div class="image-container">
          <img src="/manual-images/sidebar-access.png" alt="Admin Reports entry in sidebar" />
          <p class="caption">Admin Reports menu item in the sidebar</p>
        </div>
        <ul>
          <li>Open the left sidebar and select <code>Admin Reports</code>.</li>
          <li>Access requires admin rights or the permission <code>Can view Admin Reports</code>.</li>
        </ul>
      </section>

      <section>
        <h2>Layout</h2>
        <div class="image-container">
          <img src="/manual-images/page-header.png" alt="Admin Reports page header" />
          <p class="caption">Page header with export and save actions</p>
        </div>
        <div class="image-container">
          <img src="/manual-images/filters-card.png" alt="Filters card" />
          <p class="caption">Date range and city filters</p>
        </div>
        <div class="image-container">
          <img src="/manual-images/historical-card.png" alt="Historical Data card" />
          <p class="caption">Historical data management</p>
        </div>
        <ul>
          <li>Header includes <code>Export CSV</code>, <code>Export PDF</code>, <code>Save View</code>, and the theme toggle.</li>
          <li>Filters card controls date range and city selection.</li>
          <li>Historical Data card manages archived seasons and comparisons.</li>
          <li>Tabs split the report into <code>Overview</code>, <code>Costs</code>, <code>Inventory</code>, and <code>Statements</code>.</li>
        </ul>
      </section>

      <section>
        <h2>Filters</h2>
        <div class="image-container">
          <img src="/manual-images/date-filters.png" alt="Date range presets" />
          <p class="caption">Date range presets and custom date selection</p>
        </div>
        <ol>
          <li>Choose a preset: Today, Week, Month, Quarter, or Custom.</li>
          <li>If you select Custom, set <code>Start date</code> and <code>End date</code>.</li>
          <li>Use the City multi-select to filter specific locations.</li>
          <li>Leave the city filter empty to include all cities.</li>
          <li>Reports refresh automatically when the range or cities change.</li>
        </ol>
      </section>

      <section>
        <h2>Header Actions</h2>
        <div class="image-container">
          <img src="/manual-images/export-buttons.png" alt="Export buttons" />
          <p class="caption">Export and Save View buttons</p>
        </div>
        <ul>
          <li><code>Export CSV</code> downloads a file named <code>admin-report-YYYY-MM-DD-to-YYYY-MM-DD.csv</code>.</li>
          <li>CSV includes per-order rows with date, city, customer name, order ID, pouches, kilos, unit price, revenue, plus a totals row.</li>
          <li><code>Export PDF</code> opens a print dialog with a summary and a detailed orders table. Allow pop-ups in your browser.</li>
          <li><code>Save View</code> stores your date range and city selections locally in this browser.</li>
          <li>Theme toggle switches between light and dark modes.</li>
        </ul>
      </section>

      <section>
        <h2>Historical Mode</h2>
        <div class="image-container">
          <img src="/manual-images/historical-mode.png" alt="Historical mode selector" />
          <p class="caption">Historical mode and season selection</p>
        </div>
        <ol>
          <li>Select <code>Current</code>, <code>Historical</code>, or <code>Compare</code> from Report Mode.</li>
          <li>In <code>Historical</code> mode, choose a season to see an info banner with saved totals.</li>
          <li>The main report tabs continue to use your active date range and city filters.</li>
          <li>In <code>Compare</code> mode, pick two seasons and click <code>Compare</code> to view KPI differences.</li>
          <li>Click <code>Archive Season</code> to save a season based on the current date range.</li>
          <li>In the Archive dialog, enter a season name and start/end dates, then confirm.</li>
        </ol>
      </section>

      <section>
        <h2>Overview Tab</h2>
        <div class="image-container">
          <img src="/manual-images/overview-kpis.png" alt="Overview KPI cards" />
          <p class="caption">Key performance indicator cards</p>
        </div>
        <div class="image-container">
          <img src="/manual-images/overview-charts.png" alt="Overview charts" />
          <p class="caption">Production and performance charts</p>
        </div>
        <ul>
          <li>KPIs show total kilos, pouches produced, revenue, gross profit, net profit, and yield.</li>
          <li>Yield compares actual pouches to expected pouches calculated from kilograms produced.</li>
          <li>Insights show total orders, average order value, top city, and average revenue per kg.</li>
          <li>Charts include Production vs Sales (line), Performance by City (bar), and Yield Variance (line).</li>
          <li>Hover charts to see exact values in tooltips.</li>
        </ul>
      </section>

      <section>
        <h2>Costs Tab</h2>
        <div class="image-container">
          <img src="/manual-images/cost-centers.png" alt="Cost centers list" />
          <p class="caption">Cost centers management</p>
        </div>
        <div class="image-container">
          <img src="/manual-images/cost-entries.png" alt="Cost entries table" />
          <p class="caption">Cost entries tracking</p>
        </div>
        <ul>
          <li>Totals chips display Direct, Overhead, and Total costs for the selected date range.</li>
          <li>Create cost centers first, then add cost entries against those centers.</li>
          <li>Cost centers are categorized as <code>Direct</code> or <code>Overhead</code>.</li>
          <li>Cost entries require a date, cost center, and amount; notes are optional.</li>
          <li>Edit and delete actions are available from the icon buttons in each row.</li>
        </ul>
      </section>

      <section>
        <h2>Inventory Tab</h2>
        <div class="image-container">
          <img src="/manual-images/inventory-summary.png" alt="Inventory summary" />
          <p class="caption">Inventory summary table</p>
        </div>
        <div class="image-container">
          <img src="/manual-images/inventory-items.png" alt="Inventory items" />
          <p class="caption">Inventory items list</p>
        </div>
        <div class="image-container">
          <img src="/manual-images/inventory-transactions.png" alt="Inventory transactions" />
          <p class="caption">Inventory transactions table</p>
        </div>
        <div class="image-container">
          <img src="/manual-images/auto-transactions.png" alt="Auto-generated transactions" />
          <p class="caption">Automatically generated transactions</p>
        </div>
        <ul>
          <li>Summary table shows on-hand quantity, unit, last unit cost, and inventory value.</li>
          <li>Add inventory items with name, SKU, unit, category, and optional cost center.</li>
          <li>Transactions track inventory movement with types <code>Purchase</code>, <code>Usage</code>, or <code>Adjustment</code>.</li>
          <li>Quantity must be non-zero; negative quantities are allowed only for Adjustments.</li>
          <li>Unit cost is optional; dates are required.</li>
          <li>Auto-generated transactions are listed separately for reference.</li>
        </ul>
      </section>

      <section>
        <h2>Statements Tab</h2>
        <div class="image-container">
          <img src="/manual-images/income-statement.png" alt="Income statement" />
          <p class="caption">Income statement card</p>
        </div>
        <div class="image-container">
          <img src="/manual-images/balance-sheet.png" alt="Balance sheet" />
          <p class="caption">Balance sheet card</p>
        </div>
        <ul>
          <li>Income Statement shows revenue, direct costs, gross profit, overhead, and net profit.</li>
          <li>Use <code>Export Statement</code> to print or save the income statement.</li>
          <li>Balance Sheet summarizes assets, liabilities, and equity as of the selected end date.</li>
          <li>Add assets with name, category, value, acquired date, and notes.</li>
          <li>Add liabilities with name, category, value, as-of date, and notes.</li>
          <li>Use <code>Export Statement</code> to print or save the balance sheet.</li>
        </ul>
      </section>

      <section>
        <h2>Tips</h2>
        <ul>
          <li>If you see no data, widen the date range or clear the city filter.</li>
          <li>If exports do not open, allow browser pop-ups for this site.</li>
          <li>Deleting entries requires confirmation and cannot be undone.</li>
          <li>Currency values are shown in EUR.</li>
        </ul>
      </section>
    </div>
  `;

  const manualContentFI = `
    <div class="manual-content">
      <h1>Admin Reports Käyttöohje</h1>
      
      <section>
        <h2>Pääsy</h2>
        <div class="image-container">
          <img src="/manual-images/sidebar-access.png" alt="Admin Reports sivupalkissa" />
          <p class="caption">Admin Reports -valinta sivupalkissa</p>
        </div>
        <ul>
          <li>Avaa vasen sivupalkki ja valitse <code>Admin Reports</code>.</li>
          <li>Pääsy vaatii admin-roolin tai oikeuden <code>Can view Admin Reports</code>.</li>
        </ul>
      </section>

      <section>
        <h2>Rakenne</h2>
        <div class="image-container">
          <img src="/manual-images/page-header.png" alt="Sivun otsikko" />
          <p class="caption">Sivun otsikko ja toimintopainikkeet</p>
        </div>
        <div class="image-container">
          <img src="/manual-images/filters-card.png" alt="Suodattimet" />
          <p class="caption">Päivämääräalue ja kaupunkivalitsin</p>
        </div>
        <div class="image-container">
          <img src="/manual-images/historical-card.png" alt="Historical Data" />
          <p class="caption">Historiallisten tietojen hallinta</p>
        </div>
        <ul>
          <li>Yläosassa ovat <code>Export CSV</code>, <code>Export PDF</code>, <code>Save View</code> ja teeman vaihto.</li>
          <li>Suodattimet-kortti ohjaa päivämääräaluetta ja kaupunkia.</li>
          <li>Historical Data -kortti hallinnoi arkistoituja kausia ja vertailuja.</li>
          <li>Välilehdet jakavat näkymän <code>Overview</code>, <code>Costs</code>, <code>Inventory</code> ja <code>Statements</code> -osiin.</li>
        </ul>
      </section>

      <section>
        <h2>Suodattimet</h2>
        <div class="image-container">
          <img src="/manual-images/date-filters.png" alt="Päivämäärävalinnat" />
          <p class="caption">Päivämääräpresets ja omat päivät</p>
        </div>
        <ol>
          <li>Valitse preset: Today, Week, Month, Quarter tai Custom.</li>
          <li>Jos valitset Custom, aseta <code>Start date</code> ja <code>End date</code>.</li>
          <li>Valitse kaupungit monivalinnasta.</li>
          <li>Jätä kaupunkivalinta tyhjäksi, jos haluat kaikki kaupungit.</li>
          <li>Raportit päivittyvät automaattisesti, kun suodattimet muuttuvat.</li>
        </ol>
      </section>

      <section>
        <h2>Toiminnot</h2>
        <div class="image-container">
          <img src="/manual-images/export-buttons.png" alt="Vientipainikkeet" />
          <p class="caption">Vienti- ja tallennuspainikkeet</p>
        </div>
        <ul>
          <li><code>Export CSV</code> lataa tiedoston <code>admin-report-YYYY-MM-DD-to-YYYY-MM-DD.csv</code>.</li>
          <li>CSV sisältää tilausrivit: päivä, kaupunki, asiakas, tilaus-ID, pussit, kilot, yksikköhinta ja liikevaihto sekä yhteensä-rivin.</li>
          <li><code>Export PDF</code> avaa tulostusnäkymän yhteenvedolla ja tilauslistalla. Salli ponnahdusikkunat selaimessa.</li>
          <li><code>Save View</code> tallentaa päivämäärät ja kaupungit paikallisesti tähän selaimeen.</li>
          <li>Teeman vaihto vaihtaa vaalean ja tumman välillä.</li>
        </ul>
      </section>

      <section>
        <h2>Historia</h2>
        <div class="image-container">
          <img src="/manual-images/historical-mode.png" alt="Historiallinen tila" />
          <p class="caption">Report Mode -valitsin ja kausilistat</p>
        </div>
        <ol>
          <li>Valitse <code>Current</code>, <code>Historical</code> tai <code>Compare</code> Report Mode -valikosta.</li>
          <li><code>Historical</code>-tilassa valitse kausi, jolloin näet infobannerin tallennetuista kokonaisarvoista.</li>
          <li>Varsinaiset raporttivälilehdet käyttävät edelleen nykyisiä päivämäärä- ja kaupunkisuodattimia.</li>
          <li><code>Compare</code>-tilassa valitse kaksi kautta ja paina <code>Compare</code>, jolloin näet KPI-erot.</li>
          <li>Paina <code>Archive Season</code>, jos haluat tallentaa kauden nykyisellä päivämääräalueella.</li>
          <li>Täytä kauden nimi sekä alku- ja loppupäivä ja vahvista.</li>
        </ol>
      </section>

      <section>
        <h2>Overview Tab</h2>
        <div class="image-container">
          <img src="/manual-images/overview-kpis.png" alt="KPI-kortit" />
          <p class="caption">Keskeisten tunnuslukujen kortit</p>
        </div>
        <div class="image-container">
          <img src="/manual-images/overview-charts.png" alt="Kaaviot" />
          <p class="caption">Tuotanto- ja suorituskaaviot</p>
        </div>
        <ul>
          <li>KPI:t näyttävät kokonaiskilot, tuotetut pussit, liikevaihdon, bruttokatteen, nettokatteen ja yieldin.</li>
          <li>Yield vertaa tuotettuja pusseja odotettuihin pusseihin kilogrammojen perusteella.</li>
          <li>Insights näyttää tilausten määrän, keskiostoksen, parhaan kaupungin ja keskimääräisen €/kg.</li>
          <li>Kaaviot: Production vs Sales (viiva), Performance by City (pylväs), Yield Variance (viiva).</li>
          <li>Vie hiiri kaavion päälle nähdäksesi tarkat arvot.</li>
        </ul>
      </section>

      <section>
        <h2>Costs Tab</h2>
        <div class="image-container">
          <img src="/manual-images/cost-centers.png" alt="Cost centers" />
          <p class="caption">Cost centers -lista</p>
        </div>
        <div class="image-container">
          <img src="/manual-images/cost-entries.png" alt="Cost entries" />
          <p class="caption">Cost entries -taulukko</p>
        </div>
        <ul>
          <li>Yhteenvetochipit näyttävät Direct-, Overhead- ja Total-kustannukset valitulta ajalta.</li>
          <li>Luo ensin cost centerit, sen jälkeen cost entryt.</li>
          <li>Cost center -kategoriat ovat <code>Direct</code> ja <code>Overhead</code>.</li>
          <li>Cost entry vaatii päivämäärän, cost centerin ja summan; muistiinpanot ovat vapaaehtoisia.</li>
          <li>Muokkaus ja poisto tehdään rivin kuvakkeista.</li>
        </ul>
      </section>

      <section>
        <h2>Inventory Tab</h2>
        <div class="image-container">
          <img src="/manual-images/inventory-summary.png" alt="Varaston yhteenveto" />
          <p class="caption">Inventory summary -taulukko</p>
        </div>
        <div class="image-container">
          <img src="/manual-images/inventory-items.png" alt="Varastokohteet" />
          <p class="caption">Inventory items -lista</p>
        </div>
        <div class="image-container">
          <img src="/manual-images/inventory-transactions.png" alt="Varastotapahtumat" />
          <p class="caption">Inventory transactions -taulukko</p>
        </div>
        <div class="image-container">
          <img src="/manual-images/auto-transactions.png" alt="Automaattiset tapahtumat" />
          <p class="caption">Automaattisesti luodut tapahtumat</p>
        </div>
        <ul>
          <li>Yhteenveto näyttää saldo, yksikkö, viimeinen yksikköhinta ja varaston arvo.</li>
          <li>Lisää inventory itemit nimellä, SKU:lla, yksiköllä, kategorialla ja halutulla cost centerillä.</li>
          <li>Transaktiotyypit ovat <code>Purchase</code>, <code>Usage</code> ja <code>Adjustment</code>.</li>
          <li>Määrän tulee olla eri kuin nolla; negatiivinen määrä sallitaan vain Adjustmenteissa.</li>
          <li>Yksikköhinta on vapaaehtoinen; päivä on pakollinen.</li>
          <li>Auto-generated transactions näkyvät erillisessä listassa viitetietona.</li>
        </ul>
      </section>

      <section>
        <h2>Statements Tab</h2>
        <div class="image-container">
          <img src="/manual-images/income-statement.png" alt="Tuloslaskelma" />
          <p class="caption">Income Statement -kortti</p>
        </div>
        <div class="image-container">
          <img src="/manual-images/balance-sheet.png" alt="Tase" />
          <p class="caption">Balance Sheet -kortti</p>
        </div>
        <ul>
          <li>Income Statement näyttää liikevaihdon, suorat kulut, bruttokatteen, yleiskulut ja nettokatteen.</li>
          <li><code>Export Statement</code> tulostaa tai tallentaa income statementin.</li>
          <li>Balance Sheet näyttää varat, velat ja oman pääoman valitun päättymispäivän mukaan.</li>
          <li>Lisää varat nimellä, kategorialla, arvolla, hankintapäivällä ja muistiinpanolla.</li>
          <li>Lisää velat nimellä, kategorialla, arvolla, as-of -päivällä ja muistiinpanolla.</li>
          <li><code>Export Statement</code> tulostaa tai tallentaa balance sheetin.</li>
        </ul>
      </section>

      <section>
        <h2>Vinkit</h2>
        <ul>
          <li>Jos dataa ei näy, laajenna päivämääräaluetta tai tyhjennä kaupunkisuodatin.</li>
          <li>Jos vienti ei aukea, salli ponnahdusikkunat tälle sivustolle.</li>
          <li>Poistot vaativat vahvistuksen eikä niitä voi perua.</li>
          <li>Valuutta on euro (EUR).</li>
        </ul>
      </section>
    </div>
  `;

  return (
    <Box sx={{ p: 3, maxWidth: '6xl', mx: 'auto' }}>
      <PageHeader
        title="Admin Reports User Manual"
        description="Comprehensive guide for using the Admin Reports section"
      />

      <Card sx={{ mt: 3 }}>
        <CardHeader
          title="User Manual"
          action={
            <Button 
              onClick={handleDownloadPDF} 
              startIcon={<Download size={16} />}
              variant="outlined"
              size="small"
            >
              Download PDF
            </Button>
          }
        />
        <CardContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={language} onChange={(e, newValue) => setLanguage(newValue)}>
              <Tab label="English" value="en" />
              <Tab label="Suomi" value="fi" />
            </Tabs>
          </Box>

          {language === 'en' && (
            <Box 
              sx={{ mt: 3, '& p': { mb: 1 }, '& ul, & ol': { ml: 2 } }}
              dangerouslySetInnerHTML={{ __html: manualContentEN }}
            />
          )}

          {language === 'fi' && (
            <Box 
              sx={{ mt: 3, '& p': { mb: 1 }, '& ul, & ol': { ml: 2 } }}
              dangerouslySetInnerHTML={{ __html: manualContentFI }}
            />
          )}
        </CardContent>
      </Card>

      <style jsx>{`
        .manual-content h1 {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 1.5rem;
          color: var(--foreground);
        }
        
        .manual-content h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 2rem;
          margin-bottom: 1rem;
          color: var(--foreground);
          border-bottom: 2px solid var(--border);
          padding-bottom: 0.5rem;
        }
        
        .manual-content section {
          margin-bottom: 2rem;
        }
        
        .manual-content .image-container {
          margin: 1.5rem 0;
          padding: 1rem;
          background: var(--muted);
          border-radius: 0.5rem;
          border: 1px solid var(--border);
        }
        
        .manual-content .image-container img {
          width: 100%;
          max-width: 800px;
          height: auto;
          border-radius: 0.375rem;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }
        
        .manual-content .caption {
          margin-top: 0.5rem;
          font-size: 0.875rem;
          font-style: italic;
          color: var(--muted-foreground);
          text-align: center;
        }
        
        .manual-content code {
          background: var(--muted);
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-family: monospace;
          font-size: 0.875em;
        }
        
        .manual-content ul, .manual-content ol {
          margin-left: 1.5rem;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        
        .manual-content li {
          margin-bottom: 0.5rem;
          line-height: 1.6;
        }
      `}</style>
    </Box>
  );
};

export default UserManualPage;
