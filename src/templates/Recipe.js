import React from "react";
import { graphql } from "gatsby";
import Grid from "@material-ui/core/Grid";
import Image from "gatsby-image";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import Layout from "../components/Layout";
import LensIcon from "@material-ui/icons/Lens";

export const query = graphql`
  query($slug: String!) {
    recipe(slug: { eq: $slug }) {
      title
      procedure
      ingredients {
        name
        notes
        qty
      }
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

const useStyles = makeStyles(theme => ({
  root: {
    flexGrow: 1,
    maxWidth: 752
  },
  ingredients: {
    backgroundColor: theme.palette.background.secondary,
    color: theme.palette.primary.main,
    "& .MuiTypography-root.MuiListItemText-secondary": {
      color: theme.palette.primary.main
    }
  },
  title: {
    margin: theme.spacing(4, 0, 2)
  }
}));

const Recipe = ({ data }) => {
  const { recipe } = data;
  const classes = useStyles();
  return (
    <Layout>
      <Typography
        className="recipeTitle"
        component="h1"
        variant="h3"
        color="inherit"
        gutterBottom
      >
        {recipe.title}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <div className={classes.ingredients}>
            <Image
              fluid={recipe.image.childImageSharp.fluid}
              alt={recipe.title}
            />
            <Typography component="h2">Ingredients</Typography>
            <List dense={true}>
              {recipe.ingredients
                ? recipe.ingredients.map((ingredient, index) => (
                    <ListItem key={`ingredient-${index}`}>
                      <ListItemIcon>
                        <LensIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        className="ingredientQty"
                        primary={ingredient.name}
                        secondary={ingredient.qty}
                      />
                    </ListItem>
                  ))
                : ""}
            </List>
          </div>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography component="h3">Procedure</Typography>
          {recipe.procedure
            ? recipe.procedure.map(procedureStep => <div>{procedureStep}</div>)
            : ""}
        </Grid>
      </Grid>
    </Layout>
  );
};

export default Recipe;
