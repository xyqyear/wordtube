from numpy import true_divide
import pandas as pd
import argparse
import requests
import base64
import csv

from requests.sessions import HTTPAdapter
from urllib3.util.retry import Retry

retries = Retry(total=5, backoff_factor=1)
session = requests.Session()
http_adapter = HTTPAdapter(max_retries=retries)
session.mount("http://", http_adapter)
session.mount("https:://", http_adapter)


def read_excel(file_path) -> pd.DataFrame:
    return pd.read_excel(file_path)


def filter_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    return df[df["original form"].notnull()]


def process_rows(df: pd.DataFrame) -> pd.DataFrame:
    # replace "\n" with "<br>" in column note
    # if image exists, then convert them to multiple img tags separated by <br>
    # make the link a tag
    for _, row in df.iterrows():
        row.word = row.word.replace("\n", "<br>")
        if pd.notna(row.note):
            row.note = row.note.replace("\n", "<br>")

        if pd.notna(row.images):
            row.images = "<br>".join(
                f'<img src="{image_url2data_uri(i)}"' for i in row.images.split("\n")
            )

        row["video link"] = f'<a href="{row["video link"]}">{row["video link"]}</a>'

    return df


def download_image_as_data_uri(image_url: str) -> str:
    response = session.get(image_url)
    content_type = response.headers["Content-Type"]
    return f"data:{content_type};base64,{base64.b64encode(response.content).decode()}"


def image_url2data_uri(image_url: str) -> str:
    if image_url.startswith("data:image"):
        return image_url
    else:
        return download_image_as_data_uri(image_url)


def main():
    parser = argparse.ArgumentParser(
        description="This script converts excel sheet to anki importable csv."
    )
    parser.add_argument(
        "-i",
        "--input-file-path",
        dest="input_file_path",
        type=str,
        help="the input excel sheet file path",
        required=True,
    )
    args = parser.parse_args()

    input_file_path = args.input_file_path
    df = read_excel(input_file_path)
    df = filter_dataframe(df)
    df = process_rows(df)
    df = df.drop("word", axis="columns")
    df.to_csv("out.csv", header=False, sep="\t", index=False, quoting=csv.QUOTE_NONE)


if __name__ == "__main__":
    main()
