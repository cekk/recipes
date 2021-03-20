import React from "react";
import { graphql } from "gatsby";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import Layout from "../components/Layout";
import Procedure from "../components/Procedure";
import Ingredients from "../components/Ingredients";
import Infos from "../components/Infos";
import Notes from "../components/Notes";
import Card from "@material-ui/core/Card";

export const query = graphql`
  query($slug: String!) {
    recipe(fields: { slug: { eq: $slug } }) {
      title
      procedure
      ingredients {
        name
        qty
      }
      note {
        description
        videoUrl
      }
      image {
        childImageSharp {
          fluid {
            ...GatsbyImageSharpFluid
          }
        }
      }
      source {
        name
        url
      }
    }
  }
`;

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
    maxWidth: 752,
  },
  title: {
    margin: theme.spacing(4, 0, 2),
  },
  mainFeaturedPost: {
    position: "relative",
    backgroundColor: theme.palette.grey[800],
    color: theme.palette.common.white,
    marginBottom: theme.spacing(4),
  },
  overlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,.3)",
  },
  mainFeaturedPostContent: {
    position: "relative",
    padding: theme.spacing(3),
    [theme.breakpoints.up("md")]: {
      padding: theme.spacing(6),
      paddingRight: 0,
    },
  },
}));

const Recipe = ({ data }) => {
  const { recipe } = data;
  const classes = useStyles();
  return (
    <Layout>
      <Paper className={classes.mainFeaturedPost}>
        {/* Increase the priority of the hero background image */}
        <div className={classes.overlay} />
        <div className={classes.mainFeaturedPostContent}>
          <Typography component="h1" variant="h3" color="inherit">
            {recipe.title}
          </Typography>
        </div>
      </Paper>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={4}>
          <Card>
            <Ingredients recipe={recipe} />
            <Infos source={recipe.source} />
          </Card>
        </Grid>
        <Grid item xs={12} sm={8}>
          <Procedure steps={recipe.procedure} />
          <Notes notes={recipe.note} />
        </Grid>
      </Grid>
    </Layout>
  );
};

export default Recipe;
