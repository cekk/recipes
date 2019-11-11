import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import Avatar from "@material-ui/core/Avatar";
import RestaurantIcon from "@material-ui/icons/Restaurant";
import { Link } from "gatsby-theme-material-ui";

const useStyles = makeStyles(theme => ({
  root: {
    flexGrow: 1
  },
  menuButton: {
    marginRight: theme.spacing(2)
  },
  headerAvatar: {
    margin: "1em 0"
  },
  toolbarTitle: {
    flex: 1
  }
}));

export default function Header() {
  const classes = useStyles();

  return (
    <div className={classes.root}>
      <AppBar position="static">
        <Toolbar>
          <Avatar className={classes.headerAvatar}>
            <Link to="/" color="secondary">
              <RestaurantIcon />
            </Link>
          </Avatar>
          <Typography
            component="h2"
            variant="h5"
            color="inherit"
            align="center"
            noWrap
            className={classes.toolbarTitle}
          >
            Cekk's Recipes
          </Typography>
        </Toolbar>
      </AppBar>
    </div>
  );
}
