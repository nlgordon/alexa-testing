provider "aws" {
  region = "us-east-1"
}

data "aws_caller_identity" "current" {}

resource "aws_dynamodb_table" "groceries-list" {
  name = "GroceriesList"
  read_capacity = 5
  write_capacity = 5
  hash_key = "UserId"
  range_key = "ListItemId"

  attribute {
    name = "UserId"
    type = "S"
  }

  attribute {
    name = "ListItemId"
    type = "S"
  }
}

resource "aws_iam_policy" "groceries-dynamo" {
  name = "groceries-dynamo-policy"
  path = "/"
  description = "Allow access to dynamo for groceries lambda"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
				"dynamodb:BatchGetItem",
				"dynamodb:GetItem",
				"dynamodb:Query",
				"dynamodb:Scan",
				"dynamodb:BatchWriteItem",
				"dynamodb:PutItem",
				"dynamodb:UpdateItem",
                "dynamodb:DeleteItem"
    ],
    "Resource": "arn:aws:dynamodb:us-east-1:${data.aws_caller_identity.current.account_id}:table/GroceriesList"
  }]
}
EOF
}