"""Correlate monthly asset moves with central bank rate changes.

Builds a monthly table of Bank of England, US Fed and ECB policy rates (plus the
UK-US and UK-euro area differentials), joins it to your asset prices, and prints the
correlation between asset % changes and rate changes in percentage points.

The same rates feed the website's /rates page (src/lib/rates.ts).

Note: FRED's BOERUKM series stopped updating in January 2017. Forward-filling it would
treat Bank Rate as 0.25% ever since, so the UK rate comes from the Bank of England's
own database (series IUDBEDR, official Bank Rate) instead.

Run:  pip install -r analysis/requirements.txt
      python analysis/rates_vs_assets.py
"""

import pandas as pd

BOE_URL = (
    "https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp"
    "?csv.x=yes&Datefrom=01/Jan/2000&Dateto=now&SeriesCodes=IUDBEDR"
    "&CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N"
)


def fred(series_id: str) -> pd.Series:
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}"
    s = pd.read_csv(url, index_col=0, parse_dates=True).iloc[:, 0]
    return pd.to_numeric(s, errors="coerce")


def boe_bank_rate() -> pd.Series:
    df = pd.read_csv(BOE_URL, storage_options={"User-Agent": "Mozilla/5.0"})
    s = pd.Series(pd.to_numeric(df.iloc[:, 1], errors="coerce").values,
                  index=pd.to_datetime(df.iloc[:, 0], format="%d %b %Y"))
    return s.sort_index()


def policy_rates() -> pd.DataFrame:
    rates = pd.DataFrame({
        "boe_rate": boe_bank_rate(),  # Bank of England Bank Rate (IUDBEDR)
        "fed_rate": fred("FEDFUNDS"),  # US Fed funds rate
        "ecb_rate": fred("ECBDFR"),    # ECB deposit facility rate
    }).resample("ME").last().ffill()
    rates["uk_us_diff"] = rates["boe_rate"] - rates["fed_rate"]
    rates["uk_eu_diff"] = rates["boe_rate"] - rates["ecb_rate"]
    return rates


def example_assets() -> pd.DataFrame:
    """Placeholder asset prices from FRED. Replace with your own `data` DataFrame
    (a date index and one column per asset)."""
    return pd.DataFrame({
        "gbp_usd": fred("DEXUSUK"),  # US dollars per pound
        "sp500": fred("SP500"),      # S&P 500 index (last 10 years on FRED)
    })


def correlate(data: pd.DataFrame, rates: pd.DataFrame) -> pd.DataFrame:
    monthly = data.resample("ME").last()
    df = monthly.join(rates, how="inner").dropna()
    # Asset % changes vs rate changes (in percentage points)
    changes = pd.concat([df[monthly.columns].pct_change() * 100,
                         df[rates.columns].diff()], axis=1).dropna()
    return changes.corr().loc[monthly.columns, rates.columns].round(2)


if __name__ == "__main__":
    rates = policy_rates()
    print("Latest rates:\n", rates.tail(3).round(2), "\n")
    print(correlate(example_assets(), rates))
