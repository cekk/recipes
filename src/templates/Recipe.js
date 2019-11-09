import React from "react";
import { graphql } from "gatsby";
import Image from "gatsby-image";

export const query = graphql`
  query($slug: String!) {
    recipe(slug: { eq: $slug }) {
      title
      image {
        childImageSharp {
          fluid {
            ...GatsbyImageSharpFluid
          }
        }
      }
    }
  }
`;

const Recipe = ({ data }) => {
  const { recipe } = data;

  return (
    <div>
      <h1>{recipe.title}</h1>
      <Image fluid={recipe.image.childImageSharp.fluid} alt={recipe.title} />
      ciao
    </div>
  );
};

export default Recipe;
