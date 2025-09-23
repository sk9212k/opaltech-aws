# ---------------------
# Build stage
# ---------------------
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj and restore as distinct layers
COPY *.csproj ./
RUN dotnet restore

# Copy everything else and build
COPY . .
RUN dotnet publish -c Release -o /app/publish

# ---------------------
# Runtime stage
# ---------------------
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

EXPOSE 80
ENV DOTNET_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "OpalTech.Api.dll"]
