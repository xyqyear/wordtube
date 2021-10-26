import pandas as pd
import argparse
import requests
import base64
import csv
import os

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
        row["original form"] = row["original form"].replace("\n", "<br>")
        if pd.notna(row.note):
            row.note = row.note.replace("\n", "<br>")

        if pd.notna(row.images):
            image_files = []
            for i, image_url in enumerate(row.images.split("\n")):
                image_file_name = download_image(
                    image_url, f'wordtube_{row["original form"]}_{i}'
                )
                image_files.append(image_file_name)
            row.images = "<br>".join(
                f'<img src="{image_file_name}">' for image_file_name in image_files
            )

        row["video link"] = f'<a href="{row["video link"]}">{row["video link"]}</a>'

    return df


def download_image(image_url: str, file_name_prefix: str) -> str:
    if image_url.startswith("data:image"):
        image_extension = image_url.split("/")[1].split(";")[0]
        image_content = base64.b64decode(image_url.split(",")[1])
    else:
        response = session.get(image_url)
        content_type = response.headers["Content-Type"]
        image_extension = content_type.split("/")[1]
        image_content = response.content

    image_file_name = f"{file_name_prefix}.{image_extension}"
    with open(os.path.join("wordtube", image_file_name), "wb") as f:
        f.write(image_content)

    return image_file_name


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
