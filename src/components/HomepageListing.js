import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import { StaticQuery, graphql } from "gatsby";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import CardMedia from "@material-ui/core/CardMedia";
import Container from "@material-ui/core/Container";
import Grid from "@material-ui/core/Grid";
import Image from "gatsby-image";
import { Link } from "gatsby";
import Typography from "@material-ui/core/Typography";

const useStyles = makeStyles(theme => ({
  icon: {
    marginRight: theme.spacing(2)
  },
  heroContent: {
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(8, 0, 6)
  },
  heroButtons: {
    marginTop: theme.spacing(4)
  },
  cardGrid: {
    paddingTop: theme.spacing(8),
    paddingBottom: theme.spacing(8)
  },
  card: {
    height: "100%",
    display: "flex",
    flexDirection: "column"
  },
  cardMedia: {
    // height: "100px" // 16:9
  },
  cardContent: {
    flexGrow: 1
  },
  footer: {
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(6)
  }
}));

const HomepageListing = ({ recipe }) => {
  const classes = useStyles();
  return (
    <StaticQuery
      query={graphql`
        query HomepageListingQuery {
          allRecipe {
            edges {
              node {
                id
                title
                slug
                image {
                  childImageSharp {
                    fixed(height: 100) {
                      ...GatsbyImageSharpFixed
                    }
                  }
                }
              }
            }
          }
          file(relativePath: { eq: "default.jpg" }) {
            childImageSharp {
              fixed(height: 100) {
                ...GatsbyImageSharpFixed
              }
            }
          }
        }
      `}
      render={({ allRecipe, file }) => {
        return (
          <Container className={classes.cardGrid} maxWidth="md">
            {/* End hero unit */}
            <Grid container spacing={4}>
              {allRecipe.edges.map(({ node }) => {
                const { id, image, title, slug } = node;
                return (
                  <Grid item key={id} xs={12} sm={6} md={4}>
                    <Card className={classes.card}>
                      <CardMedia className={classes.cardMedia}>
                        {image ? (
                          <Image
                            fixed={image.childImageSharp.fixed}
                            alt={title}
                          />
                        ) : (
                          <Image
                            fixed={file.childImageSharp.fixed}
                            alt={title}
                          />
                        )}
                      </CardMedia>
                      {/* <CardMedia
                        className={classes.cardMedia}
                        image="https://source.unsplash.com/random"
                        title="Image title"
                      /> */}
                      <CardContent className={classes.cardContent}>
                        <Typography gutterBottom variant="h5" component="h2">
                          {title}
                        </Typography>
                      </CardContent>
                      <CardActions>
                        <Button
                          component={Link}
                          to={slug}
                          size="small"
                          color="secondary"
                        >
                          View
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Container>
        );
      }}
    />
  );
};

export default HomepageListing;