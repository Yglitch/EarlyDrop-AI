import joblib
import pandas as pd
from sklearn.preprocessing import LabelEncoder
df = pd.read_csv("dataset/dataset.csv")
target_encoder = LabelEncoder()
y = target_encoder.fit_transform(df["prediction"])
print(target_encoder.classes_)

label_encoders = joblib.load("label_encoding.joblib")
print(label_encoders.keys())